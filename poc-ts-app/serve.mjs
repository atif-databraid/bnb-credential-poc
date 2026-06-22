import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const PORT = Number(process.env.PORT || '4173');
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
  res.end(body);
}

function serve(req, res) {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname || '/');

  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const absPath = path.join(ROOT, pathname);
  const normalizedRoot = path.resolve(ROOT);
  const normalizedPath = path.resolve(absPath);

  if (!normalizedPath.startsWith(normalizedRoot)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(normalizedPath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }

    const ext = path.extname(normalizedPath);
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(normalizedPath).pipe(res);
  });
}

const server = http.createServer(serve);

server.listen(PORT, () => {
  console.log(`POC server running at http://127.0.0.1:${PORT}`);
});

