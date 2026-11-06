import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const app = process.argv[2] ?? "console";
if (!["console", "scenario-lab"].includes(app))
  throw Error("Unknown preview app");
const port = app === "console" ? 4300 : 4301;
const root = resolve("dist/apps/" + app + "/browser");
createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4300");
  const file = resolve(
    root,
    "." +
      decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
  );
  if (!file.startsWith(root + "/")) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(file);
    res.setHeader(
      "Content-Type",
      { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[
        extname(file)
      ] ?? "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, "127.0.0.1");
