import express from "express";
import { startWorker } from "./worker/worker.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post("/", async (req, res) => {
  await startWorker();
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Worker running on ${PORT}`);
});
