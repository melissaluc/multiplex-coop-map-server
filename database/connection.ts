import { createDuckDB } from "./DuckDBClient.js";

let connectionPromise: ReturnType<typeof createDuckDB> | undefined;

export function getConnection() {
  if (!connectionPromise) {
    connectionPromise = createDuckDB();
  }
  return connectionPromise;
}
