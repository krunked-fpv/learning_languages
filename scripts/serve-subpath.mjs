import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const MOUNT_PREFIX = '/wanderling-subpath';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function parsePortArg(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) {
        return parsed;
      }
      throw new Error(`Invalid --port value: ${argv[i + 1]}`);
    }
    if (arg.startsWith('--port=')) {
      const raw = arg.slice('--port='.length);
      const parsed = Number.parseInt(raw, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) {
        return parsed;
      }
      throw new Error(`Invalid --port value: ${raw}`);
    }
  }
  return 0;
}

function sendRedirect(res, location) {
  res.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-cache',
  });
  res.end();
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(message);
}

if (!existsSync(DIST_DIR)) {
  console.error(`[serve-subpath] dist/ directory not found at ${DIST_DIR}. Run "npm run build" first.`);
  process.exit(1);
}

const requestedPort = parsePortArg(process.argv.slice(2));

const server = createServer((req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  let pathname = '/';
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendText(res, 400, 'Bad Request');
    return;
  }

  if (pathname === '/' || pathname === MOUNT_PREFIX) {
    sendRedirect(res, `${MOUNT_PREFIX}/`);
    return;
  }

  if (!pathname.startsWith(`${MOUNT_PREFIX}/`)) {
    sendText(res, 404, `Not Found — mount is ${MOUNT_PREFIX}/`);
    return;
  }

  let relPath = pathname.slice(`${MOUNT_PREFIX}/`.length);
  if (!relPath || relPath.endsWith('/')) {
    relPath += 'index.html';
  }

  const candidatePath = resolve(DIST_DIR, relPath);
  const distPrefix = DIST_DIR.endsWith(sep) ? DIST_DIR : `${DIST_DIR}${sep}`;
  if (candidatePath !== DIST_DIR && !candidatePath.startsWith(distPrefix)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  let filePath = candidatePath;
  if (!existsSync(filePath)) {
    sendText(res, 404, 'Not Found');
    return;
  }

  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    filePath = resolve(filePath, 'index.html');
    if (!existsSync(filePath)) {
      sendText(res, 404, 'Not Found');
      return;
    }
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const body = readFileSync(filePath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  });
  if (method === 'HEAD') {
    res.end();
  } else {
    res.end(body);
  }
});

server.listen(requestedPort, '127.0.0.1', () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : requestedPort;
  process.stdout.write(`READY http://127.0.0.1:${actualPort}${MOUNT_PREFIX}/\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
