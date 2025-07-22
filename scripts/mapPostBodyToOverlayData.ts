import { mapPostBodyToOverlayData } from "@/database/overlayConfig.ts";
import { INPUT_PAYLOAD } from "config.ts";

const parsedInputPayload = JSON.parse(INPUT_PAYLOAD)
mapPostBodyToOverlayData(parsedInputPayload)