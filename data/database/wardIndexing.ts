import {
  overlayData,
  propertyBoundaries,
  wardBoundaries,
} from "./overlayConfig.js";
import { basePath } from "../../config.js";
import { streamQueryToParquetBuffer } from "../../helpers/duckdb.js";
import { uploadFilesToHFDataset } from "../../helpers/huggingface.js";
import { getConnection } from "./connection.js";

const connection = await getConnection();

export default async function constructWardIndexing() {
  const overlays = [...overlayData, propertyBoundaries];
  const wardBoundariesHfFilePath = `${basePath}/${wardBoundaries.newName}/${wardBoundaries.name}.parquet`;
  for (const overlay of overlays) {
    const overlayHfFilePath = `${basePath}/${overlay.newName}/${overlay.name}.parquet`;
    if (overlay.skipSpatialIndex) continue;
    const query = `
      CREATE TEMP TABLE ${overlay.shortName}_ward_index AS
      SELECT 
        w."AREA_NAME" AS ward_area_name,
        CAST(w."AREA_SHORT_CODE" AS INTEGER) AS ward_area_short_code,
        o."${overlay.idField}" AS geometry_id, 
        '${overlay.newName}' AS overlay_name
      FROM read_parquet('${overlayHfFilePath}') o
      JOIN read_parquet('${wardBoundariesHfFilePath}') w
      ON ST_Intersects(
        ST_GeomFromText(o.geometry::VARCHAR),
        ST_GeomFromText(w.geometry::VARCHAR)
        )
      ORDER BY CAST(w."AREA_SHORT_CODE" AS INTEGER), o."${overlay.idField}";
    `;
    await connection.run(query);

    const resultCount = await connection.run(`
        SELECT * FROM ${overlay.shortName}_ward_index
    `);
    const resultRowCount = resultCount.rowCount;
    const parquetBuffer = await streamQueryToParquetBuffer(
      `SELECT * FROM ${overlay.shortName}_ward_index`,
      resultRowCount
    );
    console.log(`Convert parquet buffer to blob`);
    const parquetBlob = new Blob([parquetBuffer], {
      type: "application/parquet",
    });

    await connection.run(`DROP TABLE ${overlay.shortName}_ward_index`);

    const HF_file = {
      path: `${overlay.newName}_ward_index.parquet`,
      content: parquetBlob,
    };

    uploadFilesToHFDataset(HF_file, "WardIndex");
  }
}
