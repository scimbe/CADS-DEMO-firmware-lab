import http from "node:http";
import fs from "node:fs";
const OUT = process.env.OUT || "portal-received.jsonl";
fs.writeFileSync(OUT, "");
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    fs.appendFileSync(OUT, JSON.stringify({
      path: req.url,
      student: req.headers["x-cads-student"] ?? null,
      token: req.headers["x-cads-token"] ?? null,
      contentType: req.headers["content-type"] ?? null,
      body,
    }) + "\n");
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
  });
});
server.listen(8099, "0.0.0.0", () => console.log("fake portal on 0.0.0.0:8099 ->", OUT));
