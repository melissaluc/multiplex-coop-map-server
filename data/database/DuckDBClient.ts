import { DuckDBInstance } from "@duckdb/node-api";

export async function createDuckDB() {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  await connection.run(`
    INSTALL spatial;
    INSTALL httpfs;
    INSTALL json;
    LOAD spatial;
    LOAD httpfs;
    LOAD json;
  
    `);

  return connection;
}
