// Generates the API reference model from api/openapi.yaml and fails when it cannot (DC-01).
// CI runs this in the contract-tests job: `bun run --cwd apps/docs build:reference`.
import { buildReference, loadOpenApi, OpenApiError } from "../src/lib/openapi";

try {
  const reference = buildReference(loadOpenApi());
  const operations = reference.endpoints.map((e) => `${e.method} ${e.path}`);
  process.stdout.write(
    `docs reference: ${reference.title} ${reference.version}, ${String(operations.length)} operations\n`,
  );
  for (const operation of operations) process.stdout.write(`  ${operation}\n`);
} catch (error) {
  const message = error instanceof OpenApiError ? error.message : String(error);
  process.stderr.write(`docs reference: cannot generate from api/openapi.yaml: ${message}\n`);
  process.exit(1);
}
