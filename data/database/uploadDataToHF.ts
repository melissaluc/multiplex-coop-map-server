import fs from "fs/promises";
import path from "path";
import { Blob } from "buffer"; // Node's global Blob in v18+, or this polyfill
import { overlayData } from "./overlayConfig.js";
import { uploadFilesToHFDataset } from "../../helpers/huggingface.js";
import { getConnection } from "./connection.js";
const connection = await getConnection();
const folderPath = path.resolve("data/sample_data");

async function uploadAll() {
  const layers = [
    ...overlayData,
    { name: "Property_Boundaries_4326", newName: "PropertyBoundaries" },
  ];
  for (const overlay of layers) {
    // assume overlay.name is like "Zoning_Area_4326"
    const localFileName = `${overlay.name}.parquet`;
    const localFilePath = path.join(folderPath, localFileName);

    // read the Parquet file into a Buffer
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(localFilePath);

      const result = await connection.run(`
          SELECT geometry
          FROM read_parquet('${localFilePath}')
          `);
      const rows = await result.getRowObjectsJson();

      console.log("geometry: ", rows[0].geometry?.slice(0, 50));
    } catch (err) {
      console.error(`Could not read ${localFilePath}:`, err.message);
      continue;
    }

    // wrap as a Blob so your HF helper can upload it
    const fileBlob = new Blob([fileBuffer], { type: "application/parquet" });

    // build the HF‐file descriptor
    const hfDatasetName = overlay.newName;
    const hfFile = {
      path: localFileName,
      content: fileBlob,
    };

    // actually push it to Hugging Face
    try {
      await uploadFilesToHFDataset(hfFile, hfDatasetName);
      console.log(`Uploaded ${localFileName} → ${hfDatasetName}`);
    } catch (err) {
      console.error(`Upload failed for ${localFileName}:`, err.message);
    }
  }
}

uploadAll()
  .then(() => console.log("All done!"))
  .catch((err) => console.error("Fatal error", err));
