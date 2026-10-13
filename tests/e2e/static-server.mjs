import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const relativePath = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  let filePath = resolve(root, relativePath);

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) filePath = '';

  if (pathname === '/') filePath = join(root, 'index.html');

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
    return;
  }

  response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(join(root, '404.html')).pipe(response);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Static production server: http://127.0.0.1:${port}\n`);
});
