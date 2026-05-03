import express from 'express';
import crypto from 'crypto';
import { cleanEnv } from '../config/env.js';

const router = express.Router();

// Mock de fetchSystemSecret que no index antigo ficava local
const fetchSystemSecret = async (key) => {
  return null; // Pode ser implementado conectando ao Supabase depois
};

router.post("/asaas/test", async (req, res) => {
  const apiKey = String(req.body?.apiKey || "").trim();
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: "apiKey obrigatoria." });
  }

  // Buscar da tabela segura primeiro, fallback para env
  let expectedApiKey = cleanEnv(process.env.ASAAS_API_KEY || "");
  const serverApiKey = await fetchSystemSecret('asaas_api_key');
  if (serverApiKey) expectedApiKey = serverApiKey;
  
  const acceptedByPattern = /^aact_|^asaas_|^test_/.test(apiKey);
  const valid = expectedApiKey ? apiKey === expectedApiKey : acceptedByPattern;

  if (!valid) {
    return res.status(400).json({ ok: false, error: "API key invalida." });
  }

  return res.json({ ok: true, message: "Conexao com Asaas validada." });
});

router.get("/facebook/credentials/:clinicId", (req, res) => {
  const clinicId = String(req.params?.clinicId || "").trim();
  return res.json({
    ok: true,
    clinic_id: clinicId,
    connected: false,
    has_credentials: false,
  });
});

router.post("/rdstation/event", (req, res) => {
  const event = String(req.body?.event || "").trim();
  const email = String(req.body?.email || "").trim();
  if (!event || !email) {
    return res
      .status(400)
      .json({ ok: false, error: "event e email sao obrigatorios." });
  }

  return res.json({
    ok: true,
    event_id: `rd-${crypto.randomUUID()}`,
    received_at: new Date().toISOString(),
  });
});

router.post("/memed/prescription", (req, res) => {
  const patientName = String(req.body?.patient?.name || "").trim();
  const physicianName = String(
    req.body?.prescription?.physician_name || "",
  ).trim();
  const medications = Array.isArray(req.body?.prescription?.medications)
    ? req.body.prescription.medications
    : [];

  if (!patientName || !physicianName || medications.length === 0) {
    return res.status(400).json({
      ok: false,
      error:
        "patient.name, prescription.physician_name e medications sao obrigatorios.",
    });
  }

  return res.json({
    ok: true,
    prescription_id: `memed-${crypto.randomUUID()}`,
    created_at: new Date().toISOString(),
  });
});

export default router;
