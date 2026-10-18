const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8085;
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'dashboard.html' : req.url);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'dashboard.html');
  }

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  if (ext === '.css') contentType = 'text/css';
  if (ext === '.json') contentType = 'application/json';
  if (ext === '.png') contentType = 'image/png';
  if (ext === '.jpg') contentType = 'image/jpeg';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Error: ${err.code}`);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}/`);
});
