import { uploadFiles, uploadFile } from "@huggingface/hub";
import { HF_WRITE_TOKEN, HF_USERNAME } from "../config";

interface UploadFile {
  path: string;
  content: Blob;
}

export async function uploadFilesToHFDataset(
  files: Array<UploadFile> | UploadFile,
  datasetName: string,
) {
  const repo = {
    type: "dataset",
    name: `${HF_USERNAME}/${datasetName}`,
  };

  if (Array.isArray(files)) {
    await uploadFiles({
      repo,
      files,
      accessToken: HF_WRITE_TOKEN,
    });
  } else {
    await uploadFile({
      repo,
      file: files,
      accessToken: HF_WRITE_TOKEN,
    });
  }
}
