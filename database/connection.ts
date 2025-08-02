import { createDuckDB } from "@/database/DuckDBClient.ts";
import { DuckDBConnection } from "@duckdb/node-api";

let connectionPromise: ReturnType<typeof createDuckDB> | undefined;

export function getConnection(): Promise<DuckDBConnection> {
  if (!connectionPromise) {
    connectionPromise = createDuckDB();
  }
  return connectionPromise;
}
