import express from "express";
import { PORT } from "./config/env.js";
import { startWorker } from "./worker/worker.js";
import { startWebsocket } from "./service/webSockets/websocket.service.js";

const app = express();
export const server = app.listen(PORT, () =>
  console.log(`Worker running on ${PORT}`)
);

async function main() {
  startWebsocket();
  startWorker();
}

main();
