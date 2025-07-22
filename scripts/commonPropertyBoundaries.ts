import { basePath } from "../config.js";
import { streamQueryToParquetBuffer } from "@/helpers/duckdb.js";
import { uploadFilesToHFDataset } from "@/helpers/huggingface.js";
import { propertyBoundaries } from "@/database/overlayConfig.js";
import { getConnection } from "@/database/connection.js";
const connection = await getConnection();

export default async function getCommonPropertyBoundaries(): Promise<void> {
  const datasetName = propertyBoundaries.newName;
  const HF_fileName = `${propertyBoundaries.name}`;
  const wardIndexFilePath = `${basePath}/WardIndex/PropertyBoundaries_ward_index.parquet`;
  const pbReturnFields = propertyBoundaries.returnFields
    .map((field) => `"${field}"`)
    .join(", ");
  const query = `
        CREATE TEMP TABLE filtered_pb AS 
        SELECT ${pbReturnFields} ,
          wi."ward_area_short_code" AS "WARD_AREA_SHORT_CODE"
        FROM read_parquet('${basePath}/${datasetName}/${HF_fileName}.parquet') AS pb
        JOIN read_parquet('${wardIndexFilePath}') AS wi
          ON pb."_id" = wi."geometry_id"
        WHERE FEATURE_TYPE = 'COMMON';
    `;
  console.log(query);

  await connection.run(query);
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

  await connection.run(`DROP TABLE filtered_pb`);

  const HF_file = {
    path: HF_fileName,
    content: parquetBlob,
  };
  await uploadFilesToHFDataset(HF_file, "Filtered_PropertyBoundaries");
  console.log(`Uploaded "${HF_fileName}.parquet" to Hugging Face`);
}
