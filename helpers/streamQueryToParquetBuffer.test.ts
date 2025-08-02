import { describe, test, expect, jest, beforeAll } from "@jest/globals";
import { streamQueryToParquetBuffer } from "./duckdb.js";
import { getConnection } from "../data/database/connection.js";
import { overlayData } from "../data/database/overlayConfig.js";
import { basePath } from "../config.js";
let connection;
beforeAll(async () => {
  const connection = await getConnection();
});
test("geometry buffer conversion", async () => {
  const query = `
        SELECT *
        FROM read_parquet('${basePath}/WardBoundaries/City Wards Data - 4326.parquet')
    `;

  await connection.run(query);
});
