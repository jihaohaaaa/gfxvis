import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { Stats } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");
const port = parseInt(process.env.PORT || "51731", 10);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function checkStat(target: string): Promise<Stats | null> {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  req.on("error", () => {
    // Ignore client socket aborts
  });

  res.on("error", () => {
    // Ignore response write aborts
  });

  try {
    const parsedUrl = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    const reqPath = decodeURIComponent(parsedUrl.pathname);

    let filePath = join(distDir, reqPath);

    let fileStat = await checkStat(filePath);
    if (fileStat && fileStat.isDirectory()) {
      filePath = join(filePath, "index.html");
      fileStat = await checkStat(filePath);
    } else if (!fileStat && !extname(filePath)) {
      const htmlCandidate = filePath + ".html";
      const htmlStat = await checkStat(htmlCandidate);
      if (htmlStat && htmlStat.isFile()) {
        filePath = htmlCandidate;
        fileStat = htmlStat;
      } else {
        const indexCandidate = join(filePath, "index.html");
        const indexStat = await checkStat(indexCandidate);
        if (indexStat && indexStat.isFile()) {
          filePath = indexCandidate;
          fileStat = indexStat;
        }
      }
    }

    if (fileStat && fileStat.isFile()) {
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      });
      const stream = createReadStream(filePath);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
      });
      stream.pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
    }
  } catch (err) {
    console.error("[PreviewServer Request Error]", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("500 Internal Server Error");
  }
});

process.on("uncaughtException", (err) => {
  console.error("[PreviewServer UncaughtException]", err);
});

server.listen(port, "0.0.0.0", () => {
  console.log(
    `[PreviewServer] Static preview server running at http://localhost:${port}/ serving dist/`,
  );
});
