import { error } from "console";
import {
  processOverlayData,
  getPropertyBoundariesOnSpatialJoin,
} from "../../helpers/analysis.js";
import { getConnection } from "./connection.js";
const connection = await getConnection();

export default async function runOverlayAnalysis(): Promise<void> {
  console.log("Joining overlay & property boundaries");
  const processedOverlayDataFiles = await processOverlayData();
  await getPropertyBoundariesOnSpatialJoin(processedOverlayDataFiles);
  console.log("Finished spatial join");

  // Shutdown DuckDB
  connection.closeSync();
}
