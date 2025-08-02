import express from "express";
import cors from "cors";
import {
  PORT,
  API_AUTH_TOKEN,
  API_WORKFLOW_BASE_URL,
  API_RUNS_BASE_URL,
} from "./config.ts";
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
  const resBody = req.body;
  if (!resBody) {
    res.status(400).json({ error: "No data provided" });
    return;
  }

  try {
    const dispatchBody = {
      inputs: {
        payload: JSON.stringify(resBody),
      },
      ref: "main",
    };
    const workflowTriggerResponse = await fetch(
      `${API_WORKFLOW_BASE_URL}/dispatches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${API_AUTH_TOKEN}`,
        },
        body: JSON.stringify(dispatchBody),
      }
    );
    console.log("Triggered workflow");
    if (!workflowTriggerResponse.ok) {
      throw new Error(
        `GitHub API error: ${workflowTriggerResponse.statusText}`
      );
    }
    //Wait for workflow run to update in workflows/runs endpoint
    await delay(8000);
    const runId = await getWorkflowRunId();
    console.log("Workflow run ID:", runId);
    let status;
    let conclusion;
    while (status !== "completed") {
      const statusResult = await pollWorkflowRunStatus(runId);
      status = statusResult.status;
      conclusion = statusResult.conclusion;
      console.log(`Workflow run status: ${status}`);

      if (status !== "completed") {
        await delay(15000);
      }
    }

    if (conclusion === "failure") throw new Error("Workflow run failed");

    console.log("Workflow run completed successfully");
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

async function getWorkflowRunId() {
  const runsResponse = await fetch(`${API_WORKFLOW_BASE_URL}/runs`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${API_AUTH_TOKEN}`,
    },
  });

  const runsData = await runsResponse.json();
  const latestRun = runsData.workflow_runs?.[0];
  if (!latestRun) throw new Error("No workflow run found");
  return latestRun.id;
}

async function pollWorkflowRunStatus(
  runId: number
): Promise<{ [key: string]: string }> {
  const statusResponse = await fetch(`${API_RUNS_BASE_URL}/${runId}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${API_AUTH_TOKEN}`,
    },
  });
  if (!statusResponse.ok) {
    throw new Error(
      `Failed to fetch workflow run status: ${statusResponse.statusText}`
    );
  }
  const statusData = await statusResponse.json();
  return {
    status: statusData.status,
    conclusion: statusData.conclusion,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
