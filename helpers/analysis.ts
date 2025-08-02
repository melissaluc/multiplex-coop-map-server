import { overlayData, propertyBoundaries } from "@/database/overlayConfig.ts";
import { basePath } from "../config.ts";
import { streamQueryToParquetBuffer } from "./duckdb.ts";
import { uploadFilesToHFDataset } from "./huggingface.ts";
import { getConnection } from "@/database/connection.ts";
import process from "process";
import pLimit from "p-limit";
const connection = await getConnection();
const duckdbLimit = pLimit(1);
const propertyBoundariesPath = `${basePath}/Filtered_PropertyBoundaries/Property_Boundaries_4326.parquet`;

export async function getPropertyBoundariesOnSpatialJoin(
  overlayFilePaths: Array<string>
) {
  const wards = Array.from({ length: 25 }, (_, i) => i + 1);
  const limit = pLimit(3);
  const tasks = wards.map((ward) =>
    limit(() => getWardPropertyBoundariesOnSpatialJoin(overlayFilePaths, ward))
  );
  const results = await Promise.all(tasks);
  return results;
}

async function getWardPropertyBoundariesOnSpatialJoin(
  overlayFilePaths: Array<string>,
  wardInt: number
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
      return `LEFT JOIN overlay_${idx} ON ST_Intersects(pb.geom, overlay_${idx}.geom)
                AND overlay_${idx}."WARD_AREA_SHORT_CODE" = ${wardInt}`;
    })
    .join("\n");

  const queryStrSpatialJoin = `
    CREATE TEMP TABLE spatial_join_${wardInt} AS
      WITH 
      pb AS (
        SELECT *, TRY_CAST(ST_GeomFromText(geometry::VARCHAR) AS GEOMETRY) AS geom
        FROM read_parquet('${propertyBoundariesPath}')
      ),
      ${overlayJoinClauses}

      SELECT DISTINCT *  EXCLUDE ("geom", "geometry", "_id", "WARD_AREA_SHORT_CODE"), ST_AsText(pb.geom) AS geometry
      FROM pb
      ${overlayJoins}
      WHERE pb."WARD_AREA_SHORT_CODE" = ${wardInt};
      `;

  console.log(queryStrSpatialJoin);
  await duckdbLimit(() => connection.run(queryStrSpatialJoin));

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
    CREATE TEMP TABLE spatial_join_cleaned_${wardInt} AS
    SELECT *
    FROM spatial_join_${wardInt}
    WHERE ${whereNotNullClause}; 
    `;
  console.log(queryOutNull);
  await connection.run(queryOutNull);

  const resultRow = await duckdbLimit(() =>
    connection.run(`SELECT * FROM spatial_join_cleaned_${wardInt}`)
  );
  const resultRowCount = resultRow.rowCount;

  console.log("Rows of data:", resultRowCount);
  console.log("Converting DuckDBResult stream to Parquet Buffer");
  const parquetBuffer = await duckdbLimit(() =>
    streamQueryToParquetBuffer(
      `SELECT * FROM spatial_join_cleaned_${wardInt}`,
      resultRowCount
    )
  );

  console.log(`Convert parquet buffer to blob`);
  const parquetBlob = new Blob([parquetBuffer], {
    type: "application/parquet",
  });

  const HF_file = {
    path: `${propertyBoundaries.newName}_WARD-${wardInt}_Result.parquet`,
    content: parquetBlob,
  };

  await uploadFilesToHFDataset(HF_file, "Result");
  console.log("Uploaded results to Hugging Face");
  await connection.run(`
    DROP TABLE IF EXISTS spatial_join_${wardInt}; 
    DROP TABLE IF EXISTS spatial_join_cleaned_${wardInt};
    `);
}

function getWhereValueQuery(
  field: string,
  value: string | number | Array<string | number> | boolean | null | undefined,
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
  const limit = pLimit(3);
  const tasks = overlayData.map((overlay) =>
    limit(async () => {
      if (overlay.skipDataset) {
        console.log("Skipping processing for overlay:", overlay.name);
        return null;
      }

      console.log("Processing overlay:", overlay.name);
      const filePath = `${basePath}/${overlay.newName}/${overlay.name}.parquet`;
      const resultPath = `${basePath}/Filtered_${overlay.newName}/${overlay.name}.parquet`;
      const wardIndexFilePath = `${basePath}/WardIndex/${overlay.newName}_ward_index.parquet`;
      const hasValidFilters = (overlay.queryValues ?? []).some(
        (query) => query.value !== null && query.filterCondition !== null
      );

      const filterConditions =
        hasValidFilters && overlay.queryValues
          ? overlay.queryValues
              .filter(
                (query) =>
                  query.value !== null && query.filterCondition !== null
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

      const query = `
        CREATE TEMP TABLE filtered_${overlay.shortName} AS
        SELECT ${overlay.returnFields.map((field) => `"${field}"`).join(", ")},
        wi."ward_area_short_code" AS "WARD_AREA_SHORT_CODE"
        FROM read_parquet('${filePath}') o
        JOIN read_parquet('${wardIndexFilePath}') wi
          ON  o."_id" = wi."geometry_id"
        ${filterConditions ? `WHERE ${filterConditions}` : ""}
        ORDER BY wi."ward_area_short_code";
      `;
      console.log(query);

      await duckdbLimit(() => connection.run(query));
      const resultRow = await duckdbLimit(() =>
        connection.run(`
          SELECT * FROM filtered_${overlay.shortName}
      `)
      );
      const resultRowCount = resultRow.rowCount;

      const parquetBuffer = await duckdbLimit(() =>
        streamQueryToParquetBuffer(
          `SELECT * FROM filtered_${overlay.shortName}`,
          resultRowCount
        )
      );
      console.log(`Convert parquet buffer to blob`);
      const parquetBlob = new Blob([parquetBuffer], {
        type: "application/parquet",
      });

      await duckdbLimit(() =>
        connection.run(`DROP TABLE filtered_${overlay.shortName}`)
      );

      const HF_file = {
        path: `${overlay.name}.parquet`,
        content: parquetBlob,
      };
      await uploadFilesToHFDataset(HF_file, `Filtered_${overlay.newName}`);
      console.log(`Uploaded "${overlay.name}.parquet" to Hugging Face`);

      return resultPath;
    })
  );

  const results = await Promise.all(tasks);
  const filteredResult = results.filter(
    (result) => result !== null
  ) as Array<string>;

  return filteredResult;
}
