const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'node_modules', 'iq-option-client', 'dist', 'lib', 'Service', 'IQOptionService');
const wrapperPath = path.join(baseDir, 'IQOptionWrapper.js');
const wsPath = path.join(baseDir, 'IQOptionWs.js');

function patchWrapper(target) {
  if (!fs.existsSync(target)) return false;
  let code = fs.readFileSync(target, 'utf8');
  if (code.includes('HttpsProxyAgent')) { console.log('[patch] Wrapper already patched'); return true; }

  code = code.replace(
    `const InputValidator_1 = require("./Helper/InputValidator");`,
    `const InputValidator_1 = require("./Helper/InputValidator");
const HttpsProxyAgent = (() => { try { return require('https-proxy-agent').HttpsProxyAgent; } catch { return null; } })();
const HttpProxyAgent = (() => { try { return require('http-proxy-agent').HttpProxyAgent; } catch { return null; } })();`
  );

  code = code.replace(
    `        this.client = axios_1.default.create({\n            httpAgent: new http.Agent({ keepAlive: true }),\n            httpsAgent: new https.Agent({ keepAlive: true }),\n        });`,
    `        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy || '';
        if (proxyUrl && HttpsProxyAgent && HttpProxyAgent) {
          console.log('[IQOptionProxy] Using proxy for REST:', proxyUrl.replace(/:\\/\\/[^:]+:/, '://***:***@'));
          this.client = axios_1.default.create({ httpAgent: new HttpProxyAgent(proxyUrl), httpsAgent: new HttpsProxyAgent(proxyUrl) });
        } else {
          this.client = axios_1.default.create({ httpAgent: new http.Agent({ keepAlive: true }), httpsAgent: new https.Agent({ keepAlive: true }) });
        }`
  );

  code = code.replace(
    `            headers: {\n                "Content-type": "application/x-www-form-urlencoded",\n                Accept: "application/json",\n            },`,
    `            headers: {
                "Content-type": "application/x-www-form-urlencoded",
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Origin": "https://iqoption.com",
                "Referer": "https://iqoption.com/",
            },`
  );

  fs.writeFileSync(target, code, 'utf8');
  console.log('[patch] IQOptionWrapper.js patched');
  return true;
}

function patchWebSocket(target) {
  if (!fs.existsSync(target)) return false;
  let code = fs.readFileSync(target, 'utf8');
  if (code.includes('WsHttpsProxyAgent')) { console.log('[patch] WS already patched'); return true; }

  code = code.replace(
    `const Logger_1 = require("../../Helper/Logger");`,
    `const Logger_1 = require("../../Helper/Logger");
const WsHttpsProxyAgent = (() => { try { return require('https-proxy-agent').HttpsProxyAgent; } catch { return null; } })();`
  );

  // Inject wsOptions before the WebSocket constructor
  const injectBlock = `                const wsOptions = {};
                const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy || '';
                if (proxyUrl && WsHttpsProxyAgent) {
                    wsOptions.agent = new WsHttpsProxyAgent(proxyUrl);
                }
                // Fixed: removed double slash in URL`;
  code = code.replace(
    `                // Fixed: removed double slash in URL`,
    injectBlock
  );

  fs.writeFileSync(target, code, 'utf8');
  console.log('[patch] IQOptionWs.js patched');
  return true;
}

patchWrapper(wrapperPath);
patchWebSocket(wsPath);
