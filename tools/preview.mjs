import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = resolve("dist/apps/console/browser");
createServer(async (req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = resolve(root, "." + (["/", "/verification"].includes(path) ? "/index.html" : path));
  if (!file.startsWith(root + "/")) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(file);
    res.setHeader("Content-Type", {
      ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    }[extname(file)] ?? "application/octet-stream");
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4300, "127.0.0.1");
