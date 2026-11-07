import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const server = spawn(process.execPath, [
  "node_modules/typescript/lib/tsserver.js", "--disableAutomaticTypingAcquisition",
], { stdio: ["pipe", "pipe", "pipe"] });
const pending = new Map();
let sequence = 0;
let buffer = Buffer.alloc(0);
server.stdout.on("data", chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const end = buffer.indexOf("\r\n\r\n");
    if (end < 0) return;
    const length = Number(buffer.subarray(0, end).toString().match(/Content-Length: (\d+)/i)?.[1]);
    if (!Number.isFinite(length)) throw Error("Invalid tsserver frame.");
    if (buffer.length < end + 4 + length) return;
    const message = JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString());
    buffer = buffer.subarray(end + 4 + length);
    if (message.type === "response") pending.get(message.request_seq)?.(message);
  }
});
async function request(command, args) {
  const seq = ++sequence;
  return await new Promise((accept, reject) => {
    const timeout = setTimeout(() => { pending.delete(seq); reject(Error("tsserver request timeout")); }, 20000);
    pending.set(seq, response => {
      clearTimeout(timeout); pending.delete(seq);
      if (response.success) accept(response);
      else reject(Error(response.message));
    });
    server.stdin.write(JSON.stringify({ seq, type: "request", command, arguments: args }) + "\n");
  });
}
try {
  const file = resolve("dist/qualification/editor.ts");
  mkdirSync("dist/qualification", { recursive: true });
  await request("open", { file, fileContent: 'import type {components} from "../../src/generated/run";\ndeclare const run: components["schemas"]["Run"];\nrun.', projectRootPath: process.cwd() });
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const response = await request("completionInfo", { file, line: 3, offset: 5 });
    if (!response.body?.entries?.some(entry => entry.name === "state"))
      throw Error("Expected Run.state completion is missing.");
    samples.push(performance.now() - start);
  }
  const warm = samples.slice(1).sort((a, b) => a - b);
  const rss = readFileSync("/proc/" + server.pid + "/status", "utf8").match(/^VmRSS:\s+(\d+)/m)?.[1];
  if (!rss) throw Error("tsserver resident memory unavailable.");
  const receipt = { typescript: "6.0.3", node: process.versions.node,
    workload: "Run.state completion at an actual generated-type consumer",
    coldMs: samples[0], warmP50Ms: warm[2], warmP95Ms: warm[3], samples,
    rssKiB: Number(rss) };
  writeFileSync("dist/qualification/editor-baseline.json", JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  server.kill();
}
