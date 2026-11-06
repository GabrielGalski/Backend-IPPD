import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

interface Identified {
  id: number;
}

/** One application process owns each collection. Serialize the entire transaction. */
export class JsonFileStore<T extends Identified> {
  private readonly filePath: string;
  private queue: Promise<void> = Promise.resolve();

  constructor(filename: string, directory = process.env.DATA_DIR ?? 'data') {
    this.filePath = join(resolve(directory), filename);
  }

  async initialize(): Promise<void> {
    await this.findAll();
  }

  findAll(): Promise<T[]> {
    return this.serialize(() => this.read());
  }

  mutate<R>(operation: (items: T[]) => R): Promise<R> {
    return this.serialize(async () => {
      const items = await this.read();
      const result = operation(items);
      await this.save(items);
      return result;
    });
  }

  nextId(items: T[]): number {
    return items.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
  }

  private serialize<R>(operation: () => Promise<R>): Promise<R> {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async read(): Promise<T[]> {
    await mkdir(dirname(this.filePath), { recursive: true });
    let content: string;
    try {
      content = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await writeFile(this.filePath, '[]\n', { encoding: 'utf8', flag: 'wx' });
      return [];
    }
    const items: unknown = JSON.parse(content);
    if (!Array.isArray(items)) {
      throw new Error(`O arquivo ${this.filePath} deve conter uma lista JSON.`);
    }
    const ids = new Set<number>();
    for (const item of items as T[]) {
      if (
        item === null ||
        typeof item !== 'object' ||
        !Number.isSafeInteger(item.id) ||
        item.id < 1 ||
        ids.has(item.id)
      ) {
        throw new Error(`O arquivo ${this.filePath} contém IDs inválidos.`);
      }
      ids.add(item.id);
    }
    return items as T[];
  }

  private async save(items: T[]): Promise<void> {
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      const file = await open(temporaryPath, 'wx');
      try {
        await file.writeFile(`${JSON.stringify(items, null, 2)}\n`, 'utf8');
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporaryPath, this.filePath);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }
}
