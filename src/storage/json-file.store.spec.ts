import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { JsonFileStore } from './json-file.store';

describe('JsonFileStore', () => {
  let directory: string;
  let store: JsonFileStore<{ id: number; nome: string }>;
  const testRoot = join(process.cwd(), 'test-results');

  beforeEach(async () => {
    await mkdir(testRoot, { recursive: true });
    directory = await mkdtemp(join(testRoot, 'nest-json-store-'));
    store = new JsonFileStore('items.json', directory);
  });

  afterEach(async () => {
    if (!directory.startsWith(testRoot + sep))
      throw new Error('Diretório de teste inválido');
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  });

  it('creates a missing data directory and JSON file', async () => {
    const nestedStore = new JsonFileStore(
      'items.json',
      join(directory, 'nested'),
    );
    await expect(nestedStore.findAll()).resolves.toEqual([]);
    expect(
      JSON.parse(await readFile(join(directory, 'nested/items.json'), 'utf8')),
    ).toEqual([]);
  });

  it('keeps all concurrent writes with unique IDs', async () => {
    await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
        store.mutate((items) => {
          const item = { id: store.nextId(items), nome: `Item ${index}` };
          items.push(item);
          return item;
        }),
      ),
    );
    const items = await store.findAll();
    expect(items).toHaveLength(30);
    expect(new Set(items.map((item) => item.id)).size).toBe(30);
    const reopened = new JsonFileStore('items.json', directory);
    await expect(reopened.findAll()).resolves.toEqual(items);
  });

  it('recovers the queue after a rejected mutation without saving partial changes', async () => {
    await expect(
      store.mutate((items) => {
        items.push({ id: 1, nome: 'Should not be saved' });
        throw new Error('Invalid operation');
      }),
    ).rejects.toThrow('Invalid operation');
    await expect(store.findAll()).resolves.toEqual([]);
    await store.mutate((items) => items.push({ id: 1, nome: 'Saved' }));
    await expect(store.findAll()).resolves.toEqual([{ id: 1, nome: 'Saved' }]);
  });

  it.each(['{invalid', '{}', '[{"id":1},{"id":1}]', '[{"id":null}]'])(
    'preserves an invalid file instead of resetting its data: %s',
    async (content) => {
      await writeFile(join(directory, 'items.json'), content);
      await expect(store.initialize()).rejects.toThrow();
      expect(await readFile(join(directory, 'items.json'), 'utf8')).toBe(
        content,
      );
    },
  );
});
