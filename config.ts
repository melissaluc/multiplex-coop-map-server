import "dotenv/config";

export const HF_WRITE_TOKEN = process.env.HF_WRITE_TOKEN!;
export const HF_READ_TOKEN = process.env.HF_READ_TOKEN!;
export const HF_USERNAME = process.env.HF_USERNAME!;
export const LOCAL_BASE_PATH = process.env.LOCAL_BASE_PATH!;
export const PORT = process.env.PORT;
export const basePath = `hf://datasets/ProjectMultiplexCoop`;
