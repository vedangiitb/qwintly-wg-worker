import { PubSub } from "@google-cloud/pubsub";
import { spawn } from "child_process";
import WebSocket from "ws";

const subscriptionName =
  process.env.PUBSUB_SUBSCRIPTION || "website-generation-sub";

async function startWorker() {
  console.log("🚀 Worker started");
  const pubsub = new PubSub();
  const subscription = pubsub.subscription(subscriptionName);

  subscription.on(
    "message",
    async (msg: {
      data: { toString: () => string };
      ack: () => void;
      nack: () => void;
    }) => {
      const payload = JSON.parse(msg.data.toString());
      console.log("💬 Received job:", payload);

      try {
        // Start builder container
        console.log("🚀 Starting builder container...");

        const container = spawn("docker", [
          "run",
          "--rm",
          "-p",
          "7777:7777", // Expose MCP WebSocket from builder
          "-e",
          `JOB_PAYLOAD=${JSON.stringify(payload)}`,
          "builder-container",
        ]);

        // Log container output
        container.stdout.on("data", (d: { toString: () => any }) =>
          console.log("🟦 [builder]", d.toString())
        );
        container.stderr.on("data", (d: { toString: () => any }) =>
          console.error("🟥 [builder-error]", d.toString())
        );

        // WAIT for builder MCP server to boot
        console.log("⏳ Waiting for MCP server...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log("🔗 Connecting MCP WebSocket...");
        const ws = new WebSocket("ws://localhost:7777");

        ws.on("open", async () => {
          console.log("🟢 MCP server connected!");

          // Ask LLM what to do
          console.log("🤖 Calling LLM for MCP tool call...");

          // --- MOCK LLM CALL FOR NOW ---
          // LLM decides to call MCP tool: list_files
          const llmToolCall = {
            id: "1",
            method: "mcp.call",
            params: {
              tool: "list_files",
              args: { path: "/workspace" },
            },
          };

          console.log("🤖 LLM requested tool:", llmToolCall);

          ws.send(JSON.stringify(llmToolCall));
        });

        ws.on("message", (data: { toString: () => any }) => {
          console.log("📥 Received MCP response:", data.toString());
          console.log("🔌 Closing MCP WebSocket (job complete)...");
          ws.close();
        });

        ws.on("close", () => console.log("🔌 MCP connection closed"));
        ws.on("error", (err: any) => console.error("❌ MCP error:", err));

        // Handle builder exit
        container.on("close", (code: number) => {
          console.log(`🏁 Builder exited with code ${code}`);
          if (code === 0) {
            msg.ack();
          } else {
            msg.nack();
          }
        });
      } catch (err) {
        console.error("❌ Worker error:", err);
        msg.nack();
      }
    }
  );
}

startWorker();
