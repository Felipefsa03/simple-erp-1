// ============================================
// LuminaFlow - Testes de Integração - API
// ============================================

import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const API_PORT = '18787';
const API_BASE = `http://localhost:${API_PORT}`;
const SERVER_START_TIMEOUT_MS = 45000;
const HEALTH_ENDPOINT = `${API_BASE}/api/health`;

let serverProcess = null;
let startedByTest = false;

const isServerOnline = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(HEALTH_ENDPOINT, { signal: controller.signal });
    return response.ok;
  } catch (_error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const waitForServer = async () => {
  const start = Date.now();
  while (Date.now() - start < SERVER_START_TIMEOUT_MS) {
    if (await isServerOnline()) return;
    await wait(500);
  }
  throw new Error('Servidor de API nao iniciou dentro do tempo esperado.');
};

beforeAll(async () => {
  if (await isServerOnline()) {
    return;
  }

  startedByTest = true;
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: API_PORT,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.on('error', (error) => {
    throw new Error(`Falha ao iniciar servidor de testes: ${error.message}`);
  });

  await waitForServer();
}, 60000);

afterAll(async () => {
  if (!startedByTest || !serverProcess) return;

  serverProcess.kill('SIGTERM');
  await wait(1000);

  if (!serverProcess.killed) {
    serverProcess.kill('SIGKILL');
  }
});

describe('API Integration Tests', () => {
  
  describe('Health Endpoints', () => {
    test('GET /api/health should return status', async () => {
      const response = await fetch(`${API_BASE}/api/health`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('version');
    });

    test('GET /api/health/extended should return full status', async () => {
      const response = await fetch(`${API_BASE}/api/health/extended`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('components');
      expect(data).toHaveProperty('metrics');
    });

    test('GET /api/stats should return system stats', async () => {
      const response = await fetch(`${API_BASE}/api/stats`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('requests');
      expect(data.requests).toHaveProperty('total');
    });
  });

  describe('WhatsApp Endpoints', () => {
    test('GET /api/whatsapp/status/:clinicId should return status', async () => {
      const response = await fetch(`${API_BASE}/api/whatsapp/status/clinic-1`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('ok');
    });

    test('GET /api/whatsapp/antispam/:number should return stats', async () => {
      const response = await fetch(`${API_BASE}/api/whatsapp/antispam/5511999999999`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('stats');
    });
  });

  describe('Campaign Endpoints', () => {
    test('GET /api/campaigns/clinic/:clinicId should return campaigns', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/clinic/clinic-1`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('campaigns');
    });
  });

  describe('Asaas Endpoints', () => {
    test('POST /api/asaas/test should reject invalid key', async () => {
      const response = await fetch(`${API_BASE}/api/asaas/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'invalid_key' })
      });
      const data = await response.json();
      
      expect(data.ok).toBe(false);
    });
  });

  describe('Integration Endpoints', () => {
    test('GET /api/facebook/credentials/:clinicId should return status', async () => {
      const response = await fetch(`${API_BASE}/api/facebook/credentials/clinic-1`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('ok');
    });

    test('POST /api/integrations/rdstation/event should accept events', async () => {
      const response = await fetch(`${API_BASE}/api/integrations/rdstation/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event: 'lead_created',
          email: 'test@example.com',
          name: 'Test Lead'
        })
      });
      const data = await response.json();
      
      expect(data.ok).toBe(true);
    });

    test('POST /api/integrations/memed/prescription should create prescription', async () => {
      const response = await fetch(`${API_BASE}/api/integrations/memed/prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: { name: 'Test Patient', cpf: '12345678900' },
          prescription: {
            physician_name: 'Dr. Test',
            physician_crm: 'CRM-SP12345',
            medications: [{ name: 'Dipirona', dosage: '500mg', quantity: 30 }]
          }
        })
      });
      const data = await response.json();
      
      expect(data.ok).toBe(true);
      expect(data).toHaveProperty('prescription_id');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoint', async () => {
      const response = await fetch(`${API_BASE}/api/nonexistent`);
      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid request body', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
