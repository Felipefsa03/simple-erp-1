import https from 'node:https';
import http from 'node:http';

const URL = process.env.KEEP_ALIVE_URL || 'https://clinxia-backend.onrender.com/api/health';

function ping() {
  const client = URL.startsWith('https') ? https : http;
  const req = client.request(URL, { method: 'GET', timeout: 10000 }, (res) => {
    console.log(`[${new Date().toISOString()}] Keep-alive: ${res.statusCode} ${URL}`);
    req.destroy();
  });
  req.on('error', () => {});
  req.on('timeout', () => req.destroy());
  req.end();
}

ping();
setInterval(ping, 9 * 60 * 1000);
