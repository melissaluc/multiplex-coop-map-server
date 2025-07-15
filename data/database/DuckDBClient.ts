import { DuckDBInstance } from "@duckdb/node-api";
import { HF_READ_TOKEN } from "../../config.js";

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
    CREATE SECRET http_auth (
      TYPE http,
      EXTRA_HTTP_HEADERS MAP {
          'Authorization': 'Bearer ${HF_READ_TOKEN}'
        }
    )
    `);

  return connection;
}
