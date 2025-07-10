import express from "express";
import cors from "cors";
import runOverlayAnalysis from "./data/database/overlayAnalysis.js";
import { getConnection } from "./data/database/connection.js";
import { mapPostBodyToOverlayData } from "./data/database/overlayConfig.js";
import { PORT } from "./config.js";
const app = express();
const port = PORT;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Multiplex Coop Map");
});

app.post("/filter-properties", async (req, res) => {
  const response = req.body;

  mapPostBodyToOverlayData(response);

  try {
    const connection = await getConnection();
    const resultUrl = await runOverlayAnalysis().catch((err: any) => {
      console.log(err);
      connection.closeSync();
    });
    res.status(200).json({
      url: resultUrl,
      message: "Results url generated",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
