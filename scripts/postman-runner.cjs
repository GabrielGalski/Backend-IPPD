const newman = require('newman');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');

function runPostman({
  baseUrl = 'http://localhost:3000',
  folders,
  collection,
  report = 'postman-run.json',
  silent = false,
}) {
  mkdirSync(join(root, 'test-results'), { recursive: true });
  return new Promise((resolve, reject) => {
    let latestVariables;
    const runner = newman.run(
      {
        collection:
          collection ??
          join(root, 'postman/Nest-JSON-API.postman_collection.json'),
        folder: folders,
        envVar: [{ key: 'baseUrl', value: baseUrl }],
        reporters: silent ? ['json'] : ['cli', 'json'],
        reporter: { json: { export: join(root, 'test-results', report) } },
        timeoutRequest: 10000,
        timeoutScript: 10000,
      },
      (error, summary) => {
        if (error) return reject(error);
        if (summary.run.failures.length) {
          return reject(
            new Error(
              `${summary.run.failures.length} falha(s) no Postman. Consulte test-results/${report}.`,
            ),
          );
        }
        summary.collectionState = summary.collection.toJSON();
        if (latestVariables)
          summary.collectionState.variable = latestVariables.values;
        resolve(summary);
      },
    );
    // Newman keeps sandbox collection-variable changes separate from the input collection.
    // Carry the last script's scope into a later run, equivalent to Keep variable values.
    runner.on('script', (_error, args) => {
      if (args.execution?.collectionVariables) {
        latestVariables = args.execution.collectionVariables.toJSON();
      }
    });
  });
}

module.exports = { runPostman };
