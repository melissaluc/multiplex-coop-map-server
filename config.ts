import "dotenv/config";

export const HF_WRITE_TOKEN = process.env.HF_WRITE_TOKEN!;
export const HF_READ_TOKEN = process.env.HF_READ_TOKEN!;
export const HF_USERNAME = process.env.HF_USERNAME!;
export const LOCAL_BASE_PATH = process.env.LOCAL_BASE_PATH!;
export const PORT = process.env.PORT;
export const basePath = `hf://datasets/ProjectMultiplexCoop`;
export const INPUT_PAYLOAD = process.env.INPUT_PAYLOAD!;
export const API_BASE_URL = process.env.API_BASE_URL!;
export const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN!;
