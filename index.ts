import express from "express";
import { PORT } from "./config/env.js";
import { startWorker } from "./worker/worker.js";

const app = express();
export const server = app.listen(PORT, () =>
  console.log(`Worker running on ${PORT}`)
);

async function main() {
  startWorker();
}

main();
