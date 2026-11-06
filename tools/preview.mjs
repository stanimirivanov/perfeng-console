import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

import { renderConsoleHtml } from "../src/bff/csp.ts";

const root = resolve(process.env.PERFENG_ADMISSION === "1" ? "dist/admission/browser" : "dist/apps/console/browser");
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
    if (extname(file) === ".html") {
      const page = renderConsoleHtml(data.toString());
      for (const [name, value] of Object.entries(page.headers)) res.setHeader(name, value);
      res.end(page.html);
    } else res.end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4300, "127.0.0.1");
