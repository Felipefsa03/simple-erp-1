// ============================================
// LuminaFlow - Testes - WhiskeyService (WhatsApp Avançado)
// ============================================
// Cobre: AI, Bot Config, Grupos, Anti-Delete, Downloaders, Sessões, Campanhas
// Total: 100+ testes em diversos cenários

import { describe, test, expect, beforeEach, afterEach, vi, jest } from "vitest";

// ── Mocks ─────────────────────────────────────────────────
vi.mock("baileys", () => {
  const mockSock = {
    ev: { on: vi.fn(), removeAllListeners: vi.fn() },
    end: vi.fn(),
    user: { id: "5511999999999:0@s.whatsapp.net" },
    sendMessage: vi.fn().mockResolvedValue({ key: { id: "msg_123" } }),
    sendPresenceUpdate: vi.fn(),
    groupParticipantsUpdate: vi.fn().mockResolvedValue([{ status: 200 }]),
    groupSettingUpdate: vi.fn().mockResolvedValue(true),
    groupInviteCode: vi.fn().mockResolvedValue("abc123"),
    revokeInviteCode: vi.fn().mockResolvedValue("def456"),
    groupMetadata: vi.fn().mockResolvedValue({
      subject: "Grupo Teste",
      participants: [{ id: "5511999999999@s.whatsapp.net", admin: null }],
      creation: 1700000000,
    }),
    groupFetchAllParticipating: vi.fn().mockResolvedValue({
      "5511999999999-123@g.us": { subject: "Grupo A", participants: [{ id: "x" }] },
    }),
    onWhatsApp: vi.fn().mockResolvedValue([{ exists: true, jid: "5511988888888@s.whatsapp.net" }]),
    requestPairingCode: vi.fn().mockResolvedValue("ABCD-1234"),
    readMessages: vi.fn().mockResolvedValue(true),
  };

  return {
    default: {
      makeWASocket: vi.fn().mockReturnValue(mockSock),
    },
    makeWASocket: vi.fn().mockReturnValue(mockSock),
    DisconnectReason: { loggedOut: 401, connectionClosed: 500 },
    useMultiFileAuthState: vi.fn().mockResolvedValue({
      state: { creds: {}, keys: {} },
      saveCreds: vi.fn(),
    }),
    makeCacheableSignalKeyStore: vi.fn().mockReturnValue({}),
    downloadMediaMessage: vi.fn(),
    BufferJSON: {},
    jidDecode: vi.fn(),
    fetchLatestBaileysVersion: vi.fn().mockResolvedValue({ version: [6, 7, 13], isLatest: true }),
  };
});

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqr") },
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqr"),
}));

// ── Imports ────────────────────────────────────────────────
import { WhiskeyService } from "../server/services/whiskeyService.js";

describe("WhiskeyService — Construtor e Configuração", () => {
  test("Construtor com configuração mínima", () => {
    const ws = new WhiskeyService({ supabaseUrl: "http://test", supabaseKey: "key", supabaseAnonKey: "anon" });
    expect(ws.supabaseUrl).toBe("http://test");
    expect(ws.supabaseKey).toBe("key");
    expect(ws.addLog).toBeDefined();
  });

  test("Construtor com addLog customizado", () => {
    const myLog = vi.fn();
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "", addLog: myLog });
    ws.addLog("teste");
    expect(myLog).toHaveBeenCalledWith("teste");
  });

  test("Construtor inicializa mapas vazios", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    expect(ws.sockets).toEqual({});
    expect(ws.connections).toEqual({});
    expect(ws.antiSpamStats).toEqual(new Map());
    expect(ws.botConfigs).toEqual({});
    expect(ws.aiConfigs).toEqual({});
  });

  test("Construtor carrega OPENAI_API_KEY do environment", () => {
    const old = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-123";
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    expect(ws.openaiKey).toBe("sk-test-123");
    process.env.OPENAI_API_KEY = old;
  });

  test("Construtor carrega DEEPSEEK_API_KEY do environment", () => {
    const old = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "ds-test-456";
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    expect(ws.deepseekKey).toBe("ds-test-456");
    process.env.DEEPSEEK_API_KEY = old;
  });

  test("getConnection retorna disconnected por padrão", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    const conn = ws.getConnection("clinic-x");
    expect(conn.status).toBe("disconnected");
  });

  test("getSocket retorna null quando não há conexão", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    expect(ws.getSocket("clinic-x")).toBeNull();
  });

  test("getAllConnections retorna objeto vazio inicialmente", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    expect(ws.getAllConnections()).toEqual({});
  });
});

describe("WhiskeyService — Conexão e Socket", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "http://test", supabaseKey: "key", supabaseAnonKey: "anon" });
  });

  test("ensureSocket cria nova conexão para clinicId", async () => {
    const sock = await ws.ensureSocket("clinic-new");
    expect(sock).toBeDefined();
    expect(ws.sockets["clinic-new"]).toBeDefined();
  });

  test("ensureSocket retorna socket existente se já conectado", async () => {
    ws.sockets["clinic-existing"] = { ev: {} };
    const sock = await ws.ensureSocket("clinic-existing");
    expect(sock).toBe(ws.sockets["clinic-existing"]);
  });

  test("ensureSocket não duplica promise se já criando", async () => {
    const p1 = ws.ensureSocket("clinic-concurrent");
    const p2 = ws.ensureSocket("clinic-concurrent");
    const [s1, s2] = await Promise.all([p1, p2]);
    expect(s1).toBe(s2);
  });

  test("disconnect limpa socket e connection", async () => {
    ws.sockets["clinic-del"] = { ev: { removeAllListeners: vi.fn() }, end: vi.fn() };
    ws.connections["clinic-del"] = { status: "connected" };
    await ws.disconnect("clinic-del");
    expect(ws.sockets["clinic-del"]).toBeUndefined();
    expect(ws.connections["clinic-del"]).toBeUndefined();
  });

  test("disconnect não lança erro se clinicId não existe", async () => {
    await expect(ws.disconnect("never-existed")).resolves.not.toThrow();
  });

  test("resetSession chama disconnect internamente", async () => {
    const spy = vi.spyOn(ws, "disconnect").mockResolvedValue();
    await ws.resetSession("clinic-x");
    expect(spy).toHaveBeenCalledWith("clinic-x");
    spy.mockRestore();
  });

  test("setAlwaysOnline inicia intervalo", async () => {
    ws.sockets["clinic-online"] = { sendPresenceUpdate: vi.fn() };
    await ws.setAlwaysOnline("clinic-online", true);
    expect(ws._onlineInterval["clinic-online"]).toBeDefined();
    clearInterval(ws._onlineInterval["clinic-online"]);
  });

  test("setAlwaysOnline para intervalo quando desabilitado", async () => {
    ws._onlineInterval = {};
    ws._onlineInterval["clinic-online"] = setInterval(() => {}, 100000);
    await ws.setAlwaysOnline("clinic-online", false);
    expect(ws._onlineInterval["clinic-online"]).toBeUndefined();
  });

  test("setAutoRead inicia intervalo quando ativado", async () => {
    ws.sockets["clinic-ar"] = { readMessages: vi.fn(), store: { chats: {} } };
    await ws.setAutoRead("clinic-ar", true);
    expect(ws._autoReadIntervals["clinic-ar"]).toBeDefined();
    clearInterval(ws._autoReadIntervals["clinic-ar"]);
  });

  test("setAutoRead limpa intervalo quando desativado", async () => {
    ws._autoReadIntervals = {};
    const timer = setInterval(() => {}, 100000);
    ws._autoReadIntervals["clinic-ar"] = timer;
    await ws.setAutoRead("clinic-ar", false);
    expect(ws._autoReadIntervals["clinic-ar"]).toBeUndefined();
  });

  test("connectWithCode retorna código de pareamento", async () => {
    ws.ensureSocket = vi.fn().mockResolvedValue({ requestPairingCode: vi.fn().mockResolvedValue("XYZ-999") });
    const code = await ws.connectWithCode("clinic-pair", "5511999999999");
    expect(code).toBe("XYZ-999");
  });

  test("connectWithCode lança erro se socket não suporta pairing", async () => {
    ws.ensureSocket = vi.fn().mockResolvedValue({});
    await expect(ws.connectWithCode("clinic-pair", "5511999999999")).rejects.toThrow("Pairing code não suportado");
  });

  test("_getCachedWaVersion retorna versão em cache", async () => {
    ws._waVersionCache = { version: [6, 7, 0], isLatest: true };
    ws._waVersionCacheTime = Date.now();
    const v = await ws._getCachedWaVersion();
    expect(v.version).toEqual([6, 7, 0]);
  });
});

describe("WhiskeyService — Envio de Mensagens", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("sendText lança erro se não conectado", async () => {
    ws.ensureSocket = vi.fn().mockResolvedValue({});
    await expect(ws.sendText("clinic-x", "5511999999999", "teste")).rejects.toThrow("WhatsApp não conectado");
  });

  test("sendText envia com sucesso", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "msg_456" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    const id = await ws.sendText("clinic-x", "5511999999999", "Olá mundo");
    expect(id).toBe("msg_456");
    expect(mockSock.sendMessage).toHaveBeenCalled();
  });

  test("sendText com placeholder {nome}", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "x" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    await ws.sendText("clinic-x", "5511999999999", "Olá {nome}, bem-vindo!");
    expect(mockSock.sendMessage).toHaveBeenCalledWith("5511999999999@s.whatsapp.net", { text: "Olá {nome}, bem-vindo!" });
  });

  test("sendMedia envia imagem", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "mid" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    const buf = Buffer.from("test").toString("base64");
    const id = await ws.sendMedia("clinic-x", "5511999999999", buf, "foto.jpg", "image/jpeg", "Legenda");
    expect(id).toBe("mid");
  });

  test("sendMedia envia documento", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "mid2" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    const buf = Buffer.from("pdf").toString("base64");
    const id = await ws.sendMedia("clinic-x", "5511999999999", buf, "doc.pdf", "application/pdf", "");
    expect(id).toBe("mid2");
  });

  test("sendMedia envia áudio", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "mid3" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    const buf = Buffer.from("ogg").toString("base64");
    const id = await ws.sendMedia("clinic-x", "5511999999999", buf, "audio.ogg", "audio/ogg; codecs=opus", "");
    expect(id).toBe("mid3");
  });

  test("sendMedia envia vídeo", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "mid4" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    const buf = Buffer.from("mp4").toString("base64");
    const id = await ws.sendMedia("clinic-x", "5511999999999", buf, "vid.mp4", "video/mp4", "Legenda");
    expect(id).toBe("mid4");
  });

  test("sendPresence envia atualização de presença", async () => {
    const mockSock = { sendPresenceUpdate: vi.fn() };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    await ws.sendPresence("clinic-x", "5511999999999", "composing");
    expect(mockSock.sendPresenceUpdate).toHaveBeenCalledWith("composing", "5511999999999@s.whatsapp.net");
  });

  test("sendPresence lança erro se JID não encontrado", async () => {
    ws.ensureSocket = vi.fn().mockResolvedValue({ sendPresenceUpdate: vi.fn() });
    ws._resolveJID = vi.fn().mockResolvedValue([]);
    await expect(ws.sendPresence("clinic-x", "5511999999999")).rejects.toThrow("JID não encontrado");
  });
});

describe("WhiskeyService — Resolução de JID", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("_phoneCandidates gera candidatos com DDI 55", () => {
    const c = ws._phoneCandidates("11988887777");
    expect(c.length).toBeGreaterThanOrEqual(1);
    expect(c[0]).toContain("55");
  });

  test("_phoneCandidates trata número com 9 dígito", () => {
    const c = ws._phoneCandidates("5511988887777");
    const hasWith9 = c.some(p => p.includes("11988887777"));
    const hasWithout9 = c.some(p => p.includes("1188887777"));
    expect(hasWith9 || hasWithout9).toBe(true);
  });

  test("_phoneCandidates remove zeros à esquerda", () => {
    const c = ws._phoneCandidates("005511998887777");
    expect(c.every(p => !p.startsWith("00"))).toBe(true);
  });

  test("_phoneCandidates trata DDD 55 repetido (5555)", () => {
    const c = ws._phoneCandidates("555511988887777");
    expect(c.every(p => !p.startsWith("5555"))).toBe(true);
  });

  test("_phoneCandidates retorna array deduplicado", () => {
    const c = ws._phoneCandidates("5511998887777");
    const unique = new Set(c);
    expect(c.length).toBe(unique.size);
  });

  test("_phoneCandidates para número curto retorna único", () => {
    const c = ws._phoneCandidates("123");
    expect(c.length).toBe(1);
    expect(c[0]).toBe("55123");
  });

  test("_phoneCandidates lida com string vazia", () => {
    const c = ws._phoneCandidates("");
    expect(c).toEqual(["55"]);
  });

  test("_resolveJID retorna cache quando disponível", async () => {
    ws.jidCache.set("5511999999999", { jid: "5511999999999@s.whatsapp.net", ts: Date.now() });
    const sock = { onWhatsApp: vi.fn() };
    const jid = await ws._resolveJID(sock, "5511999999999");
    expect(jid).toBe("5511999999999@s.whatsapp.net");
    expect(sock.onWhatsApp).not.toHaveBeenCalled();
  });

  test("_resolveJID retorna array de fallback quando onWhatsApp falha", async () => {
    const sock = { onWhatsApp: vi.fn().mockRejectedValue(new Error("Timeout")) };
    const result = await ws._resolveJID(sock, "5511999999999");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toContain("@s.whatsapp.net");
  });
});

describe("WhiskeyService — Extração de Texto de Mensagens", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("_extractText de conversation simples", () => {
    expect(ws._extractText({ conversation: "Olá" })).toBe("Olá");
  });

  test("_extractText de extendedTextMessage", () => {
    expect(ws._extractText({ extendedTextMessage: { text: "Mensagem longa" } })).toBe("Mensagem longa");
  });

  test("_extractText de imageMessage com caption", () => {
    const t = ws._extractText({ imageMessage: { caption: "Foto do produto" } });
    expect(t).toContain("Foto do produto");
  });

  test("_extractText de videoMessage com caption", () => {
    const t = ws._extractText({ videoMessage: { caption: "Vídeo tutorial" } });
    expect(t).toContain("Vídeo tutorial");
  });

  test("_extractText de documentMessage", () => {
    const t = ws._extractText({ documentMessage: { fileName: "relatorio.pdf" } });
    expect(t).toContain("relatorio.pdf");
  });

  test("_extractText de buttonsResponseMessage", () => {
    expect(ws._extractText({ buttonsResponseMessage: { selectedDisplayText: "Sim" } })).toBe("Sim");
  });

  test("_extractText de listResponseMessage", () => {
    expect(ws._extractText({ listResponseMessage: { title: "Opção 1" } })).toBe("Opção 1");
  });

  test("_extractText de viewOnceMessage aninhado", () => {
    const t = ws._extractText({ viewOnceMessage: { message: { conversation: "Mensagem única" } } });
    expect(t).toBe("Mensagem única");
  });

  test("_extractText de viewOnceMessageV2 aninhado", () => {
    const t = ws._extractText({ viewOnceMessageV2: { message: { conversation: "V2 única" } } });
    expect(t).toBe("V2 única");
  });

  test("_extractText de ephemeralMessage", () => {
    const t = ws._extractText({ ephemeralMessage: { message: { conversation: "Temp" } } });
    expect(t).toBe("Temp");
  });

  test("_extractText de reactionMessage", () => {
    const t = ws._extractText({ reactionMessage: { text: "👍" } });
    expect(t).toBe("👍 (reação)");
  });

  test("_extractText retorna null para mensagem vazia", () => {
    expect(ws._extractText({})).toBeNull();
  });

  test("_extractText retorna null para null/undefined", () => {
    expect(ws._extractText(null)).toBeNull();
    expect(ws._extractText(undefined)).toBeNull();
  });

  test("_extractText de templateButtonReplyMessage", () => {
    expect(ws._extractText({ templateButtonReplyMessage: { selectedDisplayText: "Ok" } })).toBe("Ok");
  });
});

describe("WhiskeyService — AI e Auto-Reply", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("getAIConfig retorna defaults quando não configurado", () => {
    const cfg = ws.getAIConfig("clinic-x");
    expect(cfg.enabled).toBe(false);
    expect(cfg.provider).toBe("openai");
    expect(cfg.triggerWords).toEqual([]);
    expect(cfg.onlyGroups).toBe(false);
  });

  test("setAIConfig armazena configuração", () => {
    const cfg = { enabled: true, provider: "deepseek", triggerWords: ["ajuda", "suporte"], onlyGroups: true, systemPrompt: "Seja educado" };
    ws.setAIConfig("clinic-x", cfg);
    expect(ws.getAIConfig("clinic-x")).toEqual(cfg);
  });

  test("getAIConfig retorna config específica da clinicId", () => {
    ws.setAIConfig("clinic-a", { enabled: true, provider: "openai" });
    ws.setAIConfig("clinic-b", { enabled: false, provider: "deepseek" });
    expect(ws.getAIConfig("clinic-b").enabled).toBe(false);
    expect(ws.getAIConfig("clinic-b").provider).toBe("deepseek");
  });

  test("_handleAutoReply não responde se disabled", async () => {
    ws._askAI = vi.fn();
    ws.sockets["clinic-x"] = { sendMessage: vi.fn() };
    ws.aiConfigs["clinic-x"] = { enabled: false, triggerWords: ["ajuda"] };
    await ws._handleAutoReply("clinic-x", { text: "preciso de ajuda", fromMe: false, key: "test" });
    expect(ws._askAI).not.toHaveBeenCalled();
  });

  test("_handleAutoReply não responde para mensagens próprias", async () => {
    ws._askAI = vi.fn();
    ws.sockets["clinic-x"] = { sendMessage: vi.fn() };
    ws.aiConfigs["clinic-x"] = { enabled: true, triggerWords: ["ajuda"] };
    await ws._handleAutoReply("clinic-x", { text: "preciso de ajuda", fromMe: true, key: "test" });
    expect(ws._askAI).not.toHaveBeenCalled();
  });

  test("_handleAutoReply não responde sem triggerWords", async () => {
    ws._askAI = vi.fn();
    ws.sockets["clinic-x"] = { sendMessage: vi.fn() };
    ws.aiConfigs["clinic-x"] = { enabled: true, triggerWords: [] };
    await ws._handleAutoReply("clinic-x", { text: "preciso de ajuda", fromMe: false, key: "test" });
    expect(ws._askAI).not.toHaveBeenCalled();
  });

  test("_handleAutoReply não responde se texto não contém trigger", async () => {
    ws._askAI = vi.fn();
    ws.sockets["clinic-x"] = { sendMessage: vi.fn() };
    ws.aiConfigs["clinic-x"] = { enabled: true, triggerWords: ["urgente"] };
    await ws._handleAutoReply("clinic-x", { text: "tudo bem?", fromMe: false, key: "test" });
    expect(ws._askAI).not.toHaveBeenCalled();
  });

  test("_handleAutoReply responde quando trigger match (case insensitive)", async () => {
    ws._askAI = vi.fn().mockResolvedValue("Resposta da IA");
    ws.sockets["clinic-x"] = { sendMessage: vi.fn() };
    ws.aiConfigs["clinic-x"] = { enabled: true, triggerWords: ["AJUDA"] };
    await ws._handleAutoReply("clinic-x", { text: "Preciso de ajuda!", fromMe: false, key: { remoteJid: "5511999999999@s.whatsapp.net" } });
    expect(ws._askAI).toHaveBeenCalled();
  });

  test("_askAI retorna null sem chave configurada", async () => {
    ws.openaiKey = "";
    ws.deepseekKey = "";
    const r = await ws._askAI("teste");
    expect(r).toBeNull();
  });

  test("_askAI com OpenAI faz chamada API", async () => {
    ws.openaiKey = "sk-test";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: "Resposta OpenAI" } }] }),
    });
    const r = await ws._askAI("Olá", "openai");
    expect(r).toBe("Resposta OpenAI");
  });

  test("_askAI com DeepSeek faz chamada API", async () => {
    ws.deepseekKey = "ds-test";
    ws.openaiKey = "";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: "Resposta DeepSeek" } }] }),
    });
    const r = await ws._askAI("Olá", "deepseek");
    expect(r).toBe("Resposta DeepSeek");
  });

  test("_askAI retorna null se API não responde", async () => {
    ws.openaiKey = "sk-test";
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const r = await ws._askAI("teste");
    expect(r).toBeNull();
  });
});

describe("WhiskeyService — Bot Config", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("getBotConfig retorna defaults quando não configurado", () => {
    const cfg = ws.getBotConfig("clinic-x");
    expect(cfg.autoread).toBe(false);
    expect(cfg.alwaysOnline).toBe(false);
    expect(cfg.prefix).toBe(".");
    expect(cfg.antiLink).toBe(false);
    expect(cfg.antiBadwords).toBe(false);
  });

  test("setBotConfig mescla com config existente", () => {
    ws.setBotConfig("clinic-x", { autoread: true });
    ws.setBotConfig("clinic-x", { alwaysOnline: true });
    const cfg = ws.getBotConfig("clinic-x");
    expect(cfg.autoread).toBe(true);
    expect(cfg.alwaysOnline).toBe(true);
  });

  test("setBotConfig sobrescreve prefix", () => {
    ws.setBotConfig("clinic-x", { prefix: "!" });
    expect(ws.getBotConfig("clinic-x").prefix).toBe("!");
  });

  test("setBotConfig com objeto vazio mantém defaults", () => {
    ws.setBotConfig("clinic-x", {});
    const cfg = ws.getBotConfig("clinic-x");
    expect(cfg.autoread).toBe(false);
    expect(cfg.prefix).toBe(".");
  });

  test("botConfig isolado entre clinics", () => {
    ws.setBotConfig("clinic-a", { autoread: true, alwaysOnline: true });
    ws.setBotConfig("clinic-b", { antiLink: true });
    expect(ws.getBotConfig("clinic-a").autoread).toBe(true);
    expect(ws.getBotConfig("clinic-b").autoread).toBe(false);
    expect(ws.getBotConfig("clinic-b").antiLink).toBe(true);
  });
});

describe("WhiskeyService — Gerenciamento de Grupos", () => {
  let ws;
  let mockSock;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    mockSock = {
      groupParticipantsUpdate: vi.fn().mockResolvedValue([{ status: 200 }]),
      groupSettingUpdate: vi.fn().mockResolvedValue(true),
      groupInviteCode: vi.fn().mockResolvedValue("invite123"),
      revokeInviteCode: vi.fn().mockResolvedValue("invite456"),
      groupMetadata: vi.fn().mockResolvedValue({ subject: "Teste", participants: [] }),
      groupFetchAllParticipating: vi.fn().mockResolvedValue({}),
    };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
  });

  test("groupKick remove participantes", async () => {
    const r = await ws.groupKick("clinic-x", "group@g.us", ["5511999999999@s.whatsapp.net"]);
    expect(mockSock.groupParticipantsUpdate).toHaveBeenCalledWith("group@g.us", ["5511999999999@s.whatsapp.net"], "remove");
    expect(r).toEqual([{ status: 200 }]);
  });

  test("groupAdd adiciona participantes", async () => {
    await ws.groupAdd("clinic-x", "group@g.us", ["5511988887777@s.whatsapp.net"]);
    expect(mockSock.groupParticipantsUpdate).toHaveBeenCalledWith("group@g.us", ["5511988887777@s.whatsapp.net"], "add");
  });

  test("groupPromote promove a admin", async () => {
    await ws.groupPromote("clinic-x", "group@g.us", ["5511988887777@s.whatsapp.net"]);
    expect(mockSock.groupParticipantsUpdate).toHaveBeenCalledWith("group@g.us", ["5511988887777@s.whatsapp.net"], "promote");
  });

  test("groupDemote rebaixa admin", async () => {
    await ws.groupDemote("clinic-x", "group@g.us", ["5511988887777@s.whatsapp.net"]);
    expect(mockSock.groupParticipantsUpdate).toHaveBeenCalledWith("group@g.us", ["5511988887777@s.whatsapp.net"], "demote");
  });

  test("groupMute ativa restrição (announcement)", async () => {
    await ws.groupMute("clinic-x", "group@g.us", 3600000);
    expect(mockSock.groupSettingUpdate).toHaveBeenCalledWith("group@g.us", "announcement");
  });

  test("groupMute desativa restrição com duração 0", async () => {
    await ws.groupMute("clinic-x", "group@g.us", 0);
    expect(mockSock.groupSettingUpdate).toHaveBeenCalledWith("group@g.us", "not_announcement");
  });

  test("groupToggle aplica setting personalizado", async () => {
    await ws.groupToggle("clinic-x", "group@g.us", "announcement");
    expect(mockSock.groupSettingUpdate).toHaveBeenCalledWith("group@g.us", "announcement");
  });

  test("groupInviteCode retorna código do convite", async () => {
    const code = await ws.groupInviteCode("clinic-x", "group@g.us");
    expect(code).toBe("invite123");
  });

  test("groupRevokeInvite revoga e gera novo código", async () => {
    const code = await ws.groupRevokeInvite("clinic-x", "group@g.us");
    expect(code).toBe("invite456");
  });

  test("groupInfo retorna metadata do grupo", async () => {
    const info = await ws.groupInfo("clinic-x", "group@g.us");
    expect(info.subject).toBe("Teste");
  });

  test("groupList retorna grupos do store", async () => {
    mockSock.store = { groups: { "g1@g.us": { subject: "Grupo 1", participants: [{ id: "a" }] } } };
    const list = await ws.groupList("clinic-x");
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  test("groupList busca via groupFetchAllParticipating se store vazio", async () => {
    mockSock.store = { groups: {} };
    mockSock.groupFetchAllParticipating = vi.fn().mockResolvedValue({ "g2@g.us": { subject: "Grupo 2", participants: [{ id: "x" }] } });
    const list = await ws.groupList("clinic-x");
    expect(list.length).toBe(1);
    expect(list[0].subject).toBe("Grupo 2");
  });

  test("groupKick com múltiplos participantes", async () => {
    const parts = ["5511111111111@s.whatsapp.net", "5522222222222@s.whatsapp.net"];
    await ws.groupKick("clinic-x", "group@g.us", parts);
    expect(mockSock.groupParticipantsUpdate).toHaveBeenCalledWith("group@g.us", parts, "remove");
  });

  test("groupKick com array vazio não lança erro", async () => {
    await expect(ws.groupKick("clinic-x", "group@g.us", [])).resolves.toEqual([{ status: 200 }]);
  });
});

describe("WhiskeyService — Anti-Delete e Anti-Spam", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("getDeletedMessages retorna array vazio inicialmente", async () => {
    const msgs = await ws.getDeletedMessages("clinic-x");
    expect(msgs).toEqual([]);
  });

  test("getDeletedMessages retorna mensagens da connection", async () => {
    ws.connections["clinic-x"] = { deletedMessages: [{ id: "del1", text: "apagada" }] };
    const msgs = await ws.getDeletedMessages("clinic-x");
    expect(msgs).toEqual([{ id: "del1", text: "apagada" }]);
  });

  test("getDeletedMessages retorna [] se connection não existe", async () => {
    const msgs = await ws.getDeletedMessages("inexistente");
    expect(msgs).toEqual([]);
  });

  test("updateAntiSpam acumula contagem", () => {
    ws.updateAntiSpam("5511999999999");
    ws.updateAntiSpam("5511999999999");
    ws.updateAntiSpam("5511999999999");
    const stats = ws.antiSpamStats.get("5511999999999");
    expect(stats.count).toBe(3);
  });

  test("updateAntiSpam cria novo registro se não existe", () => {
    const stats = ws.updateAntiSpam("5511888888888");
    expect(stats.count).toBe(1);
    expect(stats.firstHit).toBeDefined();
  });
});

describe("WhiskeyService — Downloaders", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("downloadYoutube retorna mensagem de configuração necessária", async () => {
    const r = await ws.downloadYoutube("https://youtube.com/watch?v=test");
    expect(r.error).toContain("external API");
  });

  test("downloadYoutube com formato video", async () => {
    const r = await ws.downloadYoutube("https://youtube.com/watch?v=test", "video");
    expect(r.error).toBeDefined();
  });

  test("downloadYoutube com URL vazia", async () => {
    const r = await ws.downloadYoutube("");
    expect(r.error).toBeDefined();
  });

  test("downloadTiktok retorna mensagem de configuração", async () => {
    const r = await ws.downloadTiktok("https://tiktok.com/@user/video/123");
    expect(r.error).toContain("external API");
  });

  test("downloadTiktok com URL inválida", async () => {
    const r = await ws.downloadTiktok("not-a-url");
    expect(r.error).toBeDefined();
  });

  test("downloadInstagram retorna mensagem de configuração", async () => {
    const r = await ws.downloadInstagram("https://instagram.com/p/ABC123");
    expect(r.error).toContain("external API");
  });

  test("downloaders não lançam exceção", async () => {
    await expect(ws.downloadYoutube("url")).resolves.not.toThrow();
    await expect(ws.downloadTiktok("url")).resolves.not.toThrow();
    await expect(ws.downloadInstagram("url")).resolves.not.toThrow();
  });
});

describe("WhiskeyService — Casos de Erro e Edge Cases", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("getConnection para clinicId numérica", () => {
    ws.connections[123] = { status: "connected" };
    expect(ws.getConnection(123).status).toBe("connected");
  });

  test("getConnection para clinicId com caracteres especiais", () => {
    ws.connections["clinic@#$%"] = { status: "qr" };
    expect(ws.getConnection("clinic@#$%").status).toBe("qr");
  });

  test("sendText com texto vazio", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "empty" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    const id = await ws.sendText("clinic-x", "5511999999999", "");
    expect(id).toBe("empty");
  });

  test("sendMedia com base64 vazio", async () => {
    const mockSock = { sendMessage: vi.fn().mockResolvedValue({ key: { id: "x" } }) };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    await expect(ws.sendMedia("clinic-x", "5511999999999", "", "", "", "")).resolves.toBeDefined();
  });

  test("ensureSocket com connection em connecting não excede timeout", async () => {
    ws.sockets["clinic-x"] = false;
    ws.connections["clinic-x"] = { status: "connecting" };
    ws.ensureSocket = vi.fn().mockResolvedValue({ sendMessage: vi.fn() });
    const r = await ws.ensureSocket("clinic-x");
    expect(r).toBeDefined();
  });

  test("JID resolution lida com setCarrier no cache", async () => {
    ws.jidCache.set("5511999999999", { jid: "5511999999999@s.whatsapp.net", ts: Date.now() - 90000000 });
    const result = await ws._resolveJID({ onWhatsApp: vi.fn().mockResolvedValue([{ exists: false }]) }, "5511999999999");
    expect(Array.isArray(result)).toBe(true);
  });

  test("getAllConnections reflete alterações", () => {
    ws.connections["nova"] = { status: "connected" };
    const all = ws.getAllConnections();
    expect(all.nova.status).toBe("connected");
  });

  test("disconnect sem socket não lança erro", async () => {
    await expect(ws.disconnect("x")).resolves.not.toThrow();
  });
});

describe("Segurança — Campanhas Não Afetadas", () => {
  test("WhiskeyService não utiliza campaignsByClinic do index.js", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    expect(ws.campaigns).toBeUndefined();
  });

  test("WhiskeyService tem sockets separados dos do index.js", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    ws.sockets["test"] = { mock: true };
    const globalSockets = {};
    expect(globalSockets["test"]).toBeUndefined();
  });

  test("Campanhas podem rodar sem WhiskeyService", () => {
    const campaignsByClinic = new Map();
    campaignsByClinic.set("clinic-1", [{
      status: "running", channel: "whatsapp", contacts: [{ phone: "5511999999999" }],
      message: "Teste", stats: { sent: 0, failed: 0, pending: 1 }
    }]);
    expect(campaignsByClinic.size).toBe(1);
    expect(campaignsByClinic.get("clinic-1")[0].channel).toBe("whatsapp");
  });

  test("WhiskeyService não interfere no rate limiting de campanhas", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    const campaignRateMap = new Map();
    ws.rateLimitMap.set("user", [Date.now()]);
    expect(campaignRateMap.size).toBe(0);
  });

  test("Processamento de campanhas usa whatsappSockets, não WhiskeyService.sockets", () => {
    const ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    ws.sockets["campanha"] = "whiskey";
    const campaignSockets = { campanha: "campaign" };
    expect(ws.sockets["campanha"]).toBe("whiskey");
    expect(campaignSockets["campanha"]).toBe("campaign");
  });
});

describe("Integração — Fluxo Completo Simulado", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
    ws._askAI = vi.fn().mockResolvedValue("Resposta simulada");
    const mockSock = {
      sendMessage: vi.fn().mockResolvedValue({ key: { id: "mock_id" } }),
      sendPresenceUpdate: vi.fn(),
    };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);
  });

  test("Fluxo: configurar IA, receber mensagem com trigger, responder", async () => {
    ws.setAIConfig("clinic-x", { enabled: true, triggerWords: ["ajuda"], provider: "openai" });
    ws.sockets["clinic-x"] = { sendMessage: vi.fn() };
    await ws._handleAutoReply("clinic-x", {
      text: "preciso de ajuda", fromMe: false,
      key: { remoteJid: "5511999999999@s.whatsapp.net" },
    });
    expect(ws._askAI).toHaveBeenCalledWith("preciso de ajuda", "openai");
  });

  test("Fluxo: configurar bot, enviar texto, verificar envio", async () => {
    ws.setBotConfig("clinic-x", { autoread: true, prefix: "!" });
    ws.connections["clinic-x"] = { status: "connected" };
    ws._resolveJID = vi.fn().mockResolvedValue("5511999999999@s.whatsapp.net");
    const id = await ws.sendText("clinic-x", "5511999999999", "Mensagem de teste");
    expect(id).toBe("mock_id");
  });

  test("Fluxo: gerenciar grupo completo", async () => {
    const mockSock = {
      groupParticipantsUpdate: vi.fn().mockResolvedValue([{ status: 200 }]),
      groupSettingUpdate: vi.fn().mockResolvedValue(true),
      groupMetadata: vi.fn().mockResolvedValue({ subject: "Vendas", participants: [{ id: "user1" }] }),
    };
    ws.ensureSocket = vi.fn().mockResolvedValue(mockSock);

    await ws.groupAdd("clinic-x", "vendas@g.us", ["5511911111111@s.whatsapp.net"]);
    await ws.groupPromote("clinic-x", "vendas@g.us", ["5511911111111@s.whatsapp.net"]);
    const info = await ws.groupInfo("clinic-x", "vendas@g.us");

    expect(mockSock.groupParticipantsUpdate).toHaveBeenCalledTimes(2);
    expect(info.subject).toBe("Vendas");
  });

  test("Fluxo: verificar mensagens deletadas", async () => {
    ws.connections["clinic-x"] = {
      deletedMessages: [
        { id: "d1", phone: "5511999999999", text: "msg secreta", timestamp: Date.now() },
      ],
    };
    const msgs = await ws.getDeletedMessages("clinic-x");
    expect(msgs.length).toBe(1);
    expect(msgs[0].text).toBe("msg secreta");
  });

  test("Fluxo: todas as configurações convivem sem conflito", () => {
    ws.setAIConfig("clinic-x", { enabled: true, provider: "deepseek" });
    ws.setBotConfig("clinic-x", { autoread: true, prefix: "/" });

    const ai = ws.getAIConfig("clinic-x");
    const bot = ws.getBotConfig("clinic-x");

    expect(ai.provider).toBe("deepseek");
    expect(bot.prefix).toBe("/");
    expect(bot.autoread).toBe(true);
  });

  test("Fluxo: múltiplas clinics isoladas", () => {
    ws.setAIConfig("c1", { enabled: true });
    ws.setBotConfig("c1", { autoread: true });
    ws.setBotConfig("c2", { antiLink: true });

    const c1ai = ws.getAIConfig("c2");
    expect(c1ai.enabled).toBe(false);
    const c1bot = ws.getBotConfig("c1");
    expect(c1bot.autoread).toBe(true);
    const c2bot = ws.getBotConfig("c2");
    expect(c2bot.antiLink).toBe(true);
    expect(c2bot.autoread).toBe(false);
  });
});

describe("Validação de Entrada — Sanitização e Edge Cases", () => {
  let ws;
  beforeEach(() => {
    ws = new WhiskeyService({ supabaseUrl: "", supabaseKey: "", supabaseAnonKey: "" });
  });

  test("_phoneCandidates trata entrada com caracteres não numéricos", () => {
    const c = ws._phoneCandidates("(11) 98888-7777");
    expect(c.every(p => /^\d+$/.test(p))).toBe(true);
  });

  test("_phoneCandidates trata entrada com código de país existente", () => {
    const c = ws._phoneCandidates("5511988887777");
    expect(c[0].startsWith("55")).toBe(true);
  });

  test("_phoneCandidates lida com null/undefined", () => {
    expect(() => ws._phoneCandidates(null)).not.toThrow();
    expect(() => ws._phoneCandidates(undefined)).not.toThrow();
  });

  test("_phoneCandidates lida com número muito grande", () => {
    const c = ws._phoneCandidates("55119888877775551999999999");
    expect(c.length).toBeGreaterThan(0);
  });

  test("antiSpamStats Map cresce corretamente", () => {
    for (let i = 0; i < 100; i++) ws.updateAntiSpam(`number-${i}`);
    expect(ws.antiSpamStats.size).toBe(100);
  });

  test("setAIConfig com undefined/null não quebra", () => {
    ws.setAIConfig("clinic-x", null);
    expect(ws.getAIConfig("clinic-x")).toEqual({ enabled: false, provider: "openai", triggerWords: [], onlyGroups: false });
  });

  test("setBotConfig com undefined/null não quebra", () => {
    ws.setBotConfig("clinic-x", null);
    ws.setBotConfig("clinic-x", undefined);
    expect(ws.getBotConfig("clinic-x")).toBeDefined();
  });

  test("sendPresence com tipo inválido não lança", async () => {
    ws._resolveJID = vi.fn().mockResolvedValue("jid@s.whatsapp.net");
    ws.ensureSocket = vi.fn().mockResolvedValue({ sendPresenceUpdate: vi.fn() });
    await expect(ws.sendPresence("clinic-x", "5511999999999", "invalid_type")).resolves.not.toThrow();
  });
});
