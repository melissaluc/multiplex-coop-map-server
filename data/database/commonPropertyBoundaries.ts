import { basePath } from "../config.js";
import { streamQueryToParquetBuffer } from "./duckdb.js";
import { uploadFilesToHFDataset } from "./huggingface.js";
import { getConnection } from "../data/database/connection.js";
const connection = await getConnection();

export async function getCommonPropertyBoundaries(): Promise<void> {
  const datasetName = "PropertyBoundaries";
  const HF_fileName = "Property_Boundaries_4326.parquet";

  await connection.run(`
        CREATE TEMP TABLE filtered_pb AS 
        SELECT "STATEDAREA", "PLAN_NAME", "PLAN_TYPE", "ADDRESS_NUMBER", "LINEAR_NAME_FULL", "geometry", "FEATURE_TYPE" 
        FROM read_parquet('${basePath}/${datasetName}/${HF_fileName}')
        WHERE FEATURE_TYPE = 'COMMON';
    `);
  const resultCount = await connection.run(`
        SELECT * FROM filtered_pb
    `);
  const resultRowCount = resultCount.rowCount;

  console.log("Rows of data:", resultRowCount);
  console.log("Converting DuckDBResult stream to Parquet Buffer");
  const parquetBuffer = await streamQueryToParquetBuffer(
    `SELECT * FROM filtered_pb`,
    resultRowCount
  );

  console.log(`Convert parquet buffer to blob`);
  const parquetBlob = new Blob([parquetBuffer], {
    type: "application/parquet",
  });

  const HF_file = {
    path: HF_fileName,
    content: parquetBlob,
  };
  await uploadFilesToHFDataset(HF_file, "Filtered_PropertyBoundaries");
  console.log(`Uploaded "${HF_fileName}.parquet" to Hugging Face`);
}
