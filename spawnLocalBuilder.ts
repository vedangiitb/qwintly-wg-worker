import { spawn } from "child_process";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function spawnLocalBuilder(
  sessionId: string,
  onLog?: (sessionId: string, message: string) => void
) {
  const builderEntry = path.resolve(
    __dirname,
    "../qwintly-builder/dist/index.js"
  );

  const child = spawn("node", [builderEntry], {
    env: {
      ...process.env,
      SESSION_ID: sessionId,
      REQUEST_TYPE: "new",
    },
    cwd: path.resolve(__dirname, "../qwintly-builder"),
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (d) => {
    const msg = d.toString();
    console.log("BUILDER STDOUT:", msg);
    if (onLog) onLog(sessionId, `BUILDER STDOUT: ${msg}`);
  });

  child.stderr.on("data", (d) => {
    const msg = d.toString();
    console.log("BUILDER STDERR:", msg);
    if (onLog) onLog(sessionId, `BUILDER STDERR: ${msg}`);
  });

  child.on("exit", (code) => {
    console.log("Builder exited with code", code);
    if (onLog) onLog(sessionId, `Builder exited with code ${code}`);
  });
}
