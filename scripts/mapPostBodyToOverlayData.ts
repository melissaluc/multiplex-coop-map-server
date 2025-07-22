import { mapPostBodyToOverlayData } from "@/database/overlayConfig.js";
import { INPUT_PAYLOAD } from "config.js";

const parsedInputPayload = JSON.parse(INPUT_PAYLOAD)
mapPostBodyToOverlayData(parsedInputPayload)