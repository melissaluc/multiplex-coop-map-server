import express from "express";
import cors from "cors";
import runOverlayAnalysis from "tasks/overlayAnalysis.ts";
import { getConnection } from "@/database/connection.ts";
import { mapPostBodyToOverlayData } from "@/database/overlayConfig.ts";
import { PORT, API_AUTH_TOKEN, API_BASE_URL } from "./config.ts";
const app = express();
const port = PORT;
const corsOptions = {
  origin: ["http://localhost:5173", "https://multiplex-coop-map.onrender.com/"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Multiplex Coop Map");
});

app.post("/filter-properties", async (req, res) => {
  const rawBody = req.body;

  if (!rawBody) {
    res.status(400).json({ error: "No data provided" });
    return;
  }

  try {
    mapPostBodyToOverlayData(rawBody);

    await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${API_AUTH_TOKEN}`,
      },
      body: JSON.stringify(rawBody),
    });

    res.status(200).json({
      message: "Results url generated",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
