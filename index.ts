import express from "express";
import cors from "cors";
import runOverlayAnalysis from "tasks/overlayAnalysis.ts";
import { getConnection } from "@/database/connection.ts";
import { mapPostBodyToOverlayData } from "@/database/overlayConfig.ts";
import { PORT } from "./config.ts";
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
  const response = req.body;
  const connection = await getConnection();

  mapPostBodyToOverlayData(response);

  try {
    const resultUrl = await runOverlayAnalysis();
    res.status(200).json({
      url: resultUrl,
      message: "Results url generated",
    });
  } catch (error: any) {
    connection.closeSync();
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
