import { overlayData } from "../data/database/overlayConfig.js";
import { basePath } from "../config.js";
import { streamQueryToParquetBuffer } from "./duckdb.js";
import { uploadFilesToHFDataset } from "./huggingface.js";
import { getConnection } from "../data/database/connection.js";
const connection = await getConnection();

export async function getPropertyBoundariesOnSpatialJoin(
  // crs: number | string,
  overlayFilePaths: Array<string>,
  propertyBoundariesPath: string
): Promise<void> {
  const overlayJoinClauses = overlayFilePaths
    .map((file, idx) => {
      return `
overlay_${idx} AS (
  SELECT *
  FROM (
    SELECT *, TRY_CAST(ST_GeomFromText(geometry::VARCHAR) AS GEOMETRY) AS geom
    FROM read_parquet('${file}')
  ) 
  WHERE geom IS NOT NULL
)`;
    })
    .join(",\n");

  const overlayJoins = overlayFilePaths
    .map((_, idx) => {
      return `LEFT JOIN overlay_${idx} ON ST_Intersects(pb.geom, overlay_${idx}.geom)`;
    })
    .join("\n");

  const overlayCols = overlayFilePaths.map(
    (_, idx) => `overlay_${idx}.* EXCLUDE overlay_${idx}.geom`
  );
  const selectedCols = ["pb.*", ...overlayCols].join(", ");

  const queryStrSpatialJoin = `
  CREATE TEMP TABLE spatial_join AS
  WITH 
  pb AS (
    SELECT *, TRY_CAST(ST_GeomFromText(geometry::VARCHAR) AS GEOMETRY) AS geom
    FROM read_parquet('${propertyBoundariesPath}')
  ),
  ${overlayJoinClauses}

  SELECT DISTINCT ${selectedCols}
  FROM pb
  ${overlayJoins};
  `;

  console.log(queryStrSpatialJoin);
  await connection.run(queryStrSpatialJoin);

  const columnsToCheck = [
    "ZN_AREA",
    // "FSI_TOTAL",
    // "PRCNT_CVER",
    // "HT_STORIES",
    "GEN_ZONE",
    "FRONTAGE",
    // "AREA_UNITS",
    // "UNITS",
  ] as const;

  const whereNotNullClause = columnsToCheck
    .map((col) => `${col} IS NOT NULL`)
    .join(" AND ");

  const queryOutNull = `
    CREATE TEMP TABLE spatial_join_cleaned AS
    SELECT * 
    FROM spatial_join
    WHERE ${whereNotNullClause};
    `;
  console.log(queryOutNull);
  await connection.run(queryOutNull);
  const spatialJoinTable = await connection.run(
    `SELECT * FROM spatial_join_cleaned`
  );

  const resultRowCount = spatialJoinTable.rowCount;

  console.log("Rows of data:", resultRowCount);
  console.log("Converting DuckDBResult stream to Parquet Buffer");
  const parquetBuffer = await streamQueryToParquetBuffer(
    `SELECT * FROM spatial_join_cleaned`,
    resultRowCount
  );

  console.log(`Convert parquet buffer to blob`);
  const parquetBlob = new Blob([parquetBuffer], {
    type: "application/parquet",
  });

  const HF_file = {
    path: `PropertyBoundaries_Result.parquet`,
    content: parquetBlob,
  };

  await uploadFilesToHFDataset(HF_file, "Result");
  console.log("Uploaded results to Hugging Face");
}

function getWhereValueQuery(
  field: string,
  value: string | number | Array<string | number> | null | undefined,
  filterCondition: string | null
): string {
  // Build out various querying conditions here, not all cases are covered at the moment
  if (Array.isArray(value)) {
    const formattedCondition = value
      .map((queryValue) =>
        typeof queryValue === "string" ? `'${queryValue}'` : queryValue
      )
      .join(", ");
    return `${field} ${filterCondition} (${formattedCondition})`;
  }
  if (value === null || value === undefined) {
    return `${field} IS NULL`;
  }
  if (typeof value === "string") {
    return `${field} ${filterCondition} '${value}'`;
  }
  if (typeof value === "number") {
    return `${field} ${filterCondition} ${value}`;
  }
  return "";
}

export async function processOverlayData(): Promise<Array<string>> {
  const processedFiles = [];

  for (const overlay of overlayData) {
    if (overlay.skipDataset) {
      console.log("Skipping processing for overlay:", overlay.name);
      continue;
    }

    console.log("Processing overlay:", overlay.name);
    const filePath = `${basePath}/${overlay.newName}/${overlay.name}.parquet`;
    const resultPath = `${basePath}/Filtered_${overlay.newName}/${overlay.name}.parquet`;

    // Determine if there are valid filters
    const hasValidFilters = (overlay.queryValues ?? []).some(
      (query) => query.value !== null && query.filterCondition !== null
    );

    // Adjust WHERE clause logic: if no filters exist, skip WHERE entirely
    const filterConditions =
      hasValidFilters && overlay.queryValues
        ? overlay.queryValues
            .filter(
              (query) => query.value !== null && query.filterCondition !== null
            )
            .map((query) =>
              getWhereValueQuery(
                query.field,
                query.value,
                query.filterCondition
              )
            )
            .join(" AND ")
        : null;

    // Construct dynamic query
    const query = `
      CREATE TEMP TABLE filtered_${overlay.shortName} AS
      SELECT ${overlay.returnFields.map((field) => `"${field}"`).join(", ")}
      FROM read_parquet('${filePath}')
      ${filterConditions ? `WHERE ${filterConditions}` : ""}
    `;
    console.log(query);

    await connection.run(query);
    const resultCount = await connection.run(`
        SELECT * FROM filtered_${overlay.shortName}
    `);
    const resultRowCount = resultCount.rowCount;
    const parquetBuffer = await streamQueryToParquetBuffer(
      `SELECT * FROM filtered_${overlay.shortName}`,
      resultRowCount
    );
    console.log(`Convert parquet buffer to blob`);
    const parquetBlob = new Blob([parquetBuffer], {
      type: "application/parquet",
    });

    const HF_file = {
      path: `${overlay.name}.parquet`,
      content: parquetBlob,
    };
    await uploadFilesToHFDataset(HF_file, `Filtered_${overlay.newName}`);
    console.log(`Uploaded "${overlay.name}.parquet" to Hugging Face`);

    processedFiles.push(resultPath);
  }

  return processedFiles;
}

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
