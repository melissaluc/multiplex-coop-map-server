import { overlayData } from "@/database/overlayConfig.ts";
import { basePath, LOCAL_BASE_PATH } from "../config.ts";
import { getConnection } from "@/database/connection.ts";
const connection = await getConnection();

export async function inspectLocalParquet() {
  const layers = [
    ...overlayData,
    { name: "Property_Boundaries_4326", newName: "PropertyBoundaries" },
  ];
  // for (const overlay of layers) {
  //   const localFileName = `${overlay.name}.parquet`;
  //   const localFilePath = `${LOCAL_BASE_PATH}/${localFileName}`;
  //   const sql = `DESCRIBE SELECT * FROM read_parquet('${localFilePath}');`;

  //   const rows = await connection.run(sql);
  //   console.log(`${localFileName}:`);
  //   console.table(await rows.getRowObjectsJson());
  // }

  const joinQuery = `
WITH parcels AS (
  SELECT 
    *, 
    ST_GeomFromText(geometry::VARCHAR) AS geom
  FROM read_parquet('${basePath}/Filtered_ZoningArea/Zoning_Area_4326.parquet')
),
zones AS (
  SELECT 
    *,  
    ST_GeomFromText(geometry::VARCHAR) AS geom
  FROM read_parquet('${basePath}/Filtered_WardBoundaries/City Wards Data - 4326.parquet')
)

SELECT 
  *,
  p.geom AS parcel_geom,
  z.geom AS zone_geom
FROM parcels p
JOIN zones z
  ON ST_Intersects(p.geom, z.geom);
`;

  //   const joinQuery = `
  // SELECT *, ST_GeomFromText(geometry::VARCHAR)
  // FROM read_parquet('${basePath}/Filtered_ZoningArea/Zoning_Area_4326.parquet')
  // `;

  console.log("Performing query...", "\n", joinQuery);
  const joinResult = await connection.run(joinQuery);
  console.log("Loading results...");
  // const rows = await joinResult.columnNamesAndTypesJson();
  // console.log(rows);
}

export async function inspectGeomWKB(): Promise<void> {
  const layers = [
    ...overlayData,
    { name: "Property_Boundaries_4326", newName: "PropertyBoundaries" },
  ];
  for (const overlay of layers) {
    const hfFileName = `${overlay.name}.parquet`;
    const hfFilePath = `${basePath}/${overlay.newName}/${hfFileName}`;

    const sql = `
WITH headers AS (
  SELECT
    substr(
      hex( geometry ),
      3, 2
    ) AS hdr
  FROM read_parquet('${hfFilePath}')
)
SELECT
  hdr,
  COUNT(*) AS cnt
FROM headers
GROUP BY hdr
ORDER BY cnt DESC;
    `;
    // using .query() will give you back an array of row-objects directly
    const rows = await connection.run(sql);
    console.log(`${hfFileName}:`);
    console.table(await rows.getRowObjectsJson());
  }
}
