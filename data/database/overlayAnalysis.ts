import * as fs from "fs";
import { createDuckDB } from "./DuckDBClient";
import { overlayData } from "./overlayConfig";
import { simplify } from "@turf/simplify";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

const connection = await createDuckDB();
const basePath = "./data/sample_data";
const resultsBasePath = `${basePath}/filtered_data`;
const filteredPropertyBoundariesPath = `${resultsBasePath}/PropertyBoundaries.parquet`;

async function getCommonPropertyBoundaries() {
  // reduce property boundaries records by filtering for FEATURE_TYPE=COMMON for land that can be developed on
  await connection.run(`
        CREATE TEMP TABLE filtered_pb AS 
        SELECT "STATEDAREA", "PLAN_NAME", "PLAN_TYPE", "ADDRESS_NUMBER", "LINEAR_NAME_FULL", "geometry", "FEATURE_TYPE" 
        FROM read_parquet('${basePath}/Property_Boundaries_4326.parquet')
        WHERE FEATURE_TYPE = 'COMMON'
    `);

  await connection.run(`
      COPY filtered_pb TO '${filteredPropertyBoundariesPath}' (FORMAT 'parquet')
      `);
}

async function processOverlayData(): Promise<Array<string>> {
  const processedFiles = [];

  for (const overlay of overlayData) {
    if (overlay.skipDataset) {
      console.log("Skipping processing for overlay:", overlay.name);
      continue;
    }

    console.log("Processing overlay:", overlay.name);
    const filePath = `${basePath}/${overlay.name}.parquet`;
    const resultPath = `${resultsBasePath}/${overlay.newName}.parquet`;

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
    await connection.run(`
      COPY filtered_${overlay.shortName} TO '${resultPath}' (FORMAT 'parquet')
    `);

    processedFiles.push(resultPath);
    console.log("Appending file processed:", resultPath);
  }

  return processedFiles;
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

async function getPropertyBoundariesOnSpatialJoin(
  // crs: number | string,
  overlayFilePaths: Array<string>,
  propertyBoundariesPath: string
): Promise<void> {
  // pass an array of files to overlay
  // await Promise.all(
  //   overlayFilePaths.map((filePath) => handleFileCRS(crs, filePath))
  // );
  const overlayJoinConditions = overlayFilePaths
    .map(
      (file, idx) =>
        `LEFT JOIN read_parquet('${file}') AS overlay_${idx} ON ST_Intersects(pb.geometry, overlay_${idx}.geometry)`
    )
    .join("\n");

  const overlayColumns = overlayFilePaths.map(
    (_, index) => `overlay_${index}.* EXCLUDE overlay_${index}.geometry`
  );

  const selectedColumns = ["pb.*", ...overlayColumns].join(", ");

  const queryStrSpatialJoin = `
        CREATE TEMP TABLE spatial_join AS
        SELECT DISTINCT ${selectedColumns}
        FROM read_parquet('${propertyBoundariesPath}') AS pb
        ${overlayJoinConditions}
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
  await connection.run(`
    COPY spatial_join_cleaned TO '${resultsBasePath}/PropertyBoundaries_Result.parquet' (FORMAT 'parquet')
    `);
}

export default async function runOverlayAnalysis(): Promise<void> {
  await getCommonPropertyBoundaries();
  console.log("Joining overlay & property boundaries");
  const processedOverlayDataFiles = await processOverlayData();
  await getPropertyBoundariesOnSpatialJoin(
    // crs,
    processedOverlayDataFiles,
    filteredPropertyBoundariesPath
  );
  console.log("Finished spatial join");

  // Export file to csv
  // await connection.run(`
  // COPY (
  //     SELECT * FROM read_parquet('${resultsBasePath}/PropertyBoundaries_Result.parquet')
  // ) TO '${resultsBasePath}/PropertyBoundaries_Result.csv' (FORMAT 'csv', HEADER);

  // `);
  const queryResult = await connection.run(`
   SELECT ST_AsGeoJSON(geometry) AS geometry, * EXCLUDE geometry
    FROM read_parquet('${resultsBasePath}/PropertyBoundaries_Result.parquet')

  `);

  const rows = await queryResult.getRowObjectsJson();

  const featCollection: FeatureCollection<Geometry, GeoJsonProperties> = {
    type: "FeatureCollection",
    features: rows.map((row: any) => {
      const { geometry, ...rest } = row as {
        geometry: string;
      } & GeoJsonProperties;

      return {
        type: "Feature",
        geometry: JSON.parse(geometry),
        properties: rest,
      };
    }),
  };

  const simplifiedPropertyBoundaries = simplify(featCollection, {
    tolerance: 0.0001,
    highQuality: false,
    mutate: true,
  });

  fs.writeFileSync(
    `${resultsBasePath}/PropertyBoundaries_Result.geojson`,
    JSON.stringify(simplifiedPropertyBoundaries, null, 2)
  );

  // Shutdown DuckDB
  connection.closeSync();
}

await runOverlayAnalysis();
