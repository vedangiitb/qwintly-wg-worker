// @ts-nocheck
import { PubSub } from "@google-cloud/pubsub";
import WebSocket from "ws";
import { spawn } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ENV
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || "website-generation-sub";
const GITHUB_MCP_WS_URL = process.env.GITHUB_MCP_WS_URL || "ws://localhost:9000/mcp";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Connect to WebSocket server
function connectWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

// Send MCP request + wait for response
function wsRequest(ws: WebSocket, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = payload.id;
    ws.send(JSON.stringify(payload));

    ws.on("message", (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.id === id) resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Route tool calls to correct MCP server
async function routeMCPCall(toolName: string, args: any, builderWS: WebSocket, githubWS: WebSocket) {
  let ws = null;

  if (toolName.startsWith("builder.")) ws = builderWS;
  else if (toolName.startsWith("github.")) ws = githubWS;
  else throw new Error("Unknown tool namespace: " + toolName);

  const cleanToolName = toolName.replace(/^builder\.|^github\./, "");

  const result = await wsRequest(ws, {
    id: "mcp-" + Math.random(),
    method: "mcp.call",
    params: {
      tool: cleanToolName,
      args,
    },
  });

  return result;
}

// Process LLM streaming tool execution
async function runLLMWorkflow(payload: any, builderWS: WebSocket, githubWS: WebSocket) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro", // agentic model
      // @ts-ignore MCP is not yet in official typings
    tools: {
      mcp: {
        servers: [
          { name: "builder", url: "ws://localhost:7777" },
          { name: "github", url: GITHUB_MCP_WS_URL }
        ],
      },
    } as any,
  });

  // Start LLM call with structured arguments
  const session = await model.startChat({
    enableMcp: true,
    history: [
      {
        role: "user",
        parts: [
          {
            text: `
You are an autonomous agent that must generate a complete website project.

USER REQUEST:
${JSON.stringify(payload, null, 2)}

TOOLS AVAILABLE:
- builder.copy_template(name)
- builder.write_file(path, content)
- builder.read_file(path)
- builder.apply_patch(path, diff)
- builder.mkdir(path)
- github.create_repo(name)
- github.write_file(path, content)
- github.commit(message)
- github.push(branch)

WORKFLOW:
1. Copy base template using builder.copy_template("nextjs-default")
2. Modify files using builder.write_file or builder.apply_patch
3. Prepare project for GitHub
4. Use github.create_repo
5. Write project files via github.write_file
6. Commit & push
7. Return final GitHub repo URL

You MUST use MCP tool calls.  
Do NOT output anything except valid tool calls or final text message.
`
          }
        ]
      }
    ]
  });

  // Now loop until LLM says job is done
  while (true) {
    const llmResponse = await session.sendMessage("continue");

    const part = llmResponse.response?.candidates?.[0]?.content?.parts?.[0];

    console.log("🤖 LLM Part:", JSON.stringify(part, null, 2));

    // If LLM returned plain text → workflow is done
    if (part.text) {
      console.log("🎉 FINAL LLM OUTPUT:", part.text);
      return part.text;
    }

    // If LLM made a MCP tool call:
    if (part.functionCall) {
      const { name, args } = part.functionCall;

      console.log("🛠 LLM calling tool:", name, args);

      const result = await routeMCPCall(name, args, builderWS, githubWS);

      console.log("📥 Tool result:", result);

      // Feed result back to LLM
      await session.sendMessage({
        role: "tool",
        parts: [
          {
            functionResponse: {
              name,
              response: result.result
            }
          }
        ]
      });
    }
  }
}

// Main worker
async function startWorker() {
  console.log("🚀 Worker started");
  const pubsub = new PubSub();
  const subscription = pubsub.subscription(subscriptionName);

  subscription.on("message", async (msg) => {
    const payload = JSON.parse(msg.data.toString());
    console.log("💬 Received job:", payload);

    try {
      // --------------------------------------
      // ⚙️ Start Builder Container
      // --------------------------------------
      console.log("🚀 Starting builder container...");
      const builderContainer = spawn("docker", [
        "run",
        "--rm",
        "-p",
        "7777:7777",
        "-e",
        `JOB_PAYLOAD=${JSON.stringify(payload)}`,
        "builder-container",
      ]);

      builderContainer.stdout.on("data", (d) =>
        console.log("🟦 [builder]", d.toString())
      );
      builderContainer.stderr.on("data", (d) =>
        console.error("🟥 [builder-error]", d.toString())
      );

      console.log("⏳ Waiting for builder MCP...");
      await new Promise((r) => setTimeout(r, 2500));

      const builderWS = await connectWebSocket("ws://localhost:7777");
      console.log("🟢 Connected → Builder MCP");

      const githubWS = await connectWebSocket(GITHUB_MCP_WS_URL);
      console.log("🟢 Connected → GitHub MCP");

      // --------------------------------------
      // 🤖 Start LLM Orchestration
      // --------------------------------------
      const finalOutput = await runLLMWorkflow(payload, builderWS, githubWS);

      console.log("🎉 BUILD COMPLETE →", finalOutput);

      builderWS.close();
      githubWS.close();
      msg.ack();
    } catch (err) {
      console.error("❌ Worker error:", err);
      msg.nack();
    }
  });
}

startWorker();
