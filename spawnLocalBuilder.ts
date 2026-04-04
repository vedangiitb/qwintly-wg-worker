import { spawn } from "child_process";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function spawnLocalBuilder(
  chatId: string,
  onLog?: (chatId: string, message: string) => void
) {
  const builderEntry = path.resolve(
    __dirname,
    "../qwintly-builder/dist/index.js"
  );

  const child = spawn("node", [builderEntry], {
    env: {
      ...process.env,
      CHAT_ID: chatId,
      REQUEST_TYPE: "new",
    },
    cwd: path.resolve(__dirname, "../qwintly-builder"),
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (d) => {
    const msg = d.toString();
    if (onLog) onLog(chatId, `BUILDER STDOUT: ${msg}`);
  });

  child.stderr.on("data", (d) => {
    const msg = d.toString();
    if (onLog) onLog(chatId, `BUILDER STDERR: ${msg}`);
  });

  child.on("exit", (code) => {
    if (onLog) onLog(chatId, `Builder exited with code ${code}`);
  });
}
