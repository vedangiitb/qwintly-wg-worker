import express from "express";
import { PORT } from "./config/env.js";
import { startWorker } from "./worker/worker.js";

const app = express();
app.get("/", (_req, res) => res.status(200).send("ok"));
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
export const server = app.listen(PORT, () =>
  console.log(`Worker running on ${PORT}`),
);

async function main() {
  try {
    await startWorker();
  } catch (err) {
    console.error("Worker failed to start:", err);
    process.exit(1);
  }
}

main();
