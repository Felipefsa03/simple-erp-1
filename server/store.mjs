import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
const dataFile = path.join(dataDir, 'runtime.json');

const defaultStore = {
  payments: {},
  subscriptions: {},
  webhooks: [],
  notifications: [],
  integrations: {
    memed: {},
    tiss: {},
    rdstation: {},
    ads: {},
  },
};

function ensureStoreFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

export function loadStore() {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    return { ...defaultStore, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Erro ao carregar store local:', error);
    return structuredClone(defaultStore);
  }
}

export function saveStore(nextStore) {
  ensureStoreFile();
  fs.writeFileSync(dataFile, JSON.stringify(nextStore, null, 2), 'utf8');
}

export function mutateStore(mutator) {
  const current = loadStore();
  const next = mutator(current) || current;
  saveStore(next);
  return next;
}
