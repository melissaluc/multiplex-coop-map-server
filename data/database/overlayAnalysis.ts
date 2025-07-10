import { basePath } from "../../config.js";
import {
  processOverlayData,
  getPropertyBoundariesOnSpatialJoin,
} from "../../helpers/analysis.js";
import { getConnection } from "./connection.js";
const connection = await getConnection();

export default async function runOverlayAnalysis(): Promise<void> {
  console.log("Joining overlay & property boundaries");
  const processedOverlayDataFiles = await processOverlayData();
  await getPropertyBoundariesOnSpatialJoin(
    processedOverlayDataFiles,
    `${basePath}/Filtered_PropertyBoundaries/Property_Boundaries_4326.parquet`
  );
  console.log("Finished spatial join");

  // Shutdown DuckDB
  connection.closeSync();
}
