import { createDuckDB } from "./DuckDBClient.ts";

let connectionPromise: ReturnType<typeof createDuckDB> | undefined;

export function getConnection() {
  if (!connectionPromise) {
    connectionPromise = createDuckDB();
  }
  return connectionPromise;
}
