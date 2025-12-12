import { spawn } from "child_process";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function spawnLocalBuilder(sessionId: string) {
  const builderEntry = path.resolve(__dirname, "../qwintly-builder/index.ts");

  const child = spawn("npx", ["ts-node", builderEntry], {
    env: {
      ...process.env,
      SESSION_ID: sessionId,
      REQUEST_TYPE: "new",
    },
    cwd: path.resolve(__dirname, "../qwintly-builder"),
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (d) => {
    console.log("BUILDER STDOUT:", d.toString());
  });

  child.stderr.on("data", (d) => {
    console.log("BUILDER STDERR:", d.toString());
  });

  child.on("exit", (code) => {
    console.log("Builder exited with code", code);
  });
}
