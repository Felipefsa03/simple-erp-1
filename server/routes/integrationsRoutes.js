import express from 'express';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../config/env.js';
import { supabaseAdmin } from '../services/supabase.js';
import { generateTISS, validateTISS } from '../../backend/tissService.js';

const router = express.Router();

const resolveAuthorizedClinicId = (req, requestedClinicId) => {
  const actorRole = String(req.user?.role || "").toLowerCase();
  const actorClinicId = String(req.clinicId || req.user?.clinic_id || "").trim();
  const targetClinicId = String(requestedClinicId || "").trim();

  if (!actorClinicId && actorRole !== "super_admin") {
    return { ok: false, status: 401, error: "Contexto de clínica ausente na sessão" };
  }

  if (actorRole === "super_admin") {
    if (!targetClinicId) {
      return { ok: false, status: 400, error: "clinicId é obrigatório para super_admin" };
    }
    return { ok: true, clinicId: targetClinicId };
  }

  if (targetClinicId && targetClinicId !== actorClinicId) {
    return { ok: false, status: 403, error: "Acesso negado para outra clínica" };
  }

  return { ok: true, clinicId: actorClinicId };
};

// Helper to get integration config from Supabase
const getIntegrationConfig = async (clinicId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('integration_config')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
      console.error(`[Integrations] Error fetching config for ${clinicId}:`, error);
    }
    return data || null;
  } catch (err) {
    console.error(`[Integrations] Fatal error fetching config for ${clinicId}:`, err);
    return null;
  }
};

// Helper to save integration config to Supabase
const saveIntegrationConfig = async (clinicId, provider, config) => {
  try {
    const existing = await getIntegrationConfig(clinicId);
    
    if (existing) {
      const { error } = await supabaseAdmin
        .from('integration_config')
        .update({ [provider]: config, updated_at: new Date().toISOString() })
        .eq('clinic_id', clinicId);
      return !error;
    } else {
      const { error } = await supabaseAdmin
        .from('integration_config')
        .insert({ 
          clinic_id: clinicId, 
          [provider]: config, 
          updated_at: new Date().toISOString() 
        });
      return !error;
    }
  } catch (err) {
    console.error(`[Integrations] Error saving config for ${clinicId}/${provider}:`, err);
    return false;
  }
};

const hasConfiguredCredentials = (provider, credentials) => {
  if (!credentials || typeof credentials !== "object") return false;
  const rules = {
    asaas: ["api_key", "apiKey"],
    google_ads: ["developer_token", "developerToken"],
    facebook: ["accessToken", "access_token"],
    google: ["refresh_token", "client_id", "client_secret", "calendar_id"],
    email_marketing: ["api_key", "apiKey"],
    rd_station: ["token", "api_key", "apiKey"],
    memed: ["token", "api_key", "apiKey"],
    meta_pixel: ["pixel_id", "pixelId", "access_token", "accessToken"],
  };

  const expectedKeys = rules[provider] || [];
  if (!expectedKeys.length) return Object.keys(credentials).length > 0;

  return expectedKeys.some((key) => {
    const value = String(credentials[key] || "").trim();
    return value.length > 0;
  });
};

// Generic routes for all integrations
const providers = ['google', 'google_ads', 'facebook', 'asaas', 'email_marketing', 'rd_station', 'memed', 'meta_pixel'];
const unsupportedProviders = new Set(['email_marketing', 'rd_station', 'memed', 'meta_pixel']);

providers.forEach(provider => {
  const routeName = provider.replace('_', '-');
  
  // GET Credentials
  router.get(`/${routeName}/credentials/:clinicId`, async (req, res) => {
    if (unsupportedProviders.has(provider)) {
      return res.status(501).json({ ok: false, connected: false, error: `O adaptador de ${routeName} ainda não está disponível.` });
    }
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const clinicId = auth.clinicId;
    const config = await getIntegrationConfig(clinicId);

    if (!config || !config[provider]) {
      return res.json({
        ok: true,
        connected: false,
        has_credentials: false,
        credentials: null
      });
    }

    // Apenas admin/super_admin enxergam os valores completos.
    // Demais perfis recebem segredos mascarados.
    const actorRole = String(req.user?.role || "").toLowerCase();
    const canSeeSecrets = ["admin", "super_admin", "owner"].includes(actorRole);
    const secretKeyPattern = /token|secret|key|password|api_key|access_token|client_secret|refresh_token/i;
    const mask = (value) => {
      const s = String(value || "");
      if (s.length <= 4) return "••••";
      return `${s.slice(0, 3)}••••${s.slice(-4)}`;
    };

    let credentials = config[provider];
    if (!canSeeSecrets && credentials && typeof credentials === "object") {
      credentials = Object.fromEntries(
        Object.entries(credentials).map(([k, v]) => [
          k,
          secretKeyPattern.test(k) ? mask(v) : v,
        ]),
      );
    }

    return res.json({
      ok: true,
      connected: true,
      has_credentials: true,
      credentials,
      masked: !canSeeSecrets,
      updatedAt: config.updated_at
    });
  });

  // POST Credentials
  router.post(`/${routeName}/credentials`, async (req, res) => {
    if (unsupportedProviders.has(provider)) {
      return res.status(501).json({ ok: false, error: `O adaptador de ${routeName} ainda não está disponível.` });
    }
    const { clinicId: requestedClinicId, ...credentials } = req.body;
    const auth = resolveAuthorizedClinicId(req, requestedClinicId);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const clinicId = auth.clinicId;

    // Apenas admin/super_admin podem gravar credenciais de integração
    const actorRole = String(req.user?.role || "").toLowerCase();
    if (!["admin", "super_admin", "owner"].includes(actorRole)) {
      return res.status(403).json({ ok: false, error: "Apenas administradores podem alterar integrações." });
    }

    const success = await saveIntegrationConfig(clinicId, provider, credentials);
    
    if (success) {
      return res.json({ ok: true, message: "Credentials saved successfully" });
    } else {
      return res.status(500).json({ ok: false, error: "Failed to save credentials" });
    }
  });

  // DELETE Credentials
  router.delete(`/${routeName}/credentials/:clinicId`, async (req, res) => {
    if (unsupportedProviders.has(provider)) {
      return res.status(501).json({ ok: false, error: `O adaptador de ${routeName} ainda não está disponível.` });
    }
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const clinicId = auth.clinicId;
    const actorRole = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'super_admin', 'owner'].includes(actorRole)) {
      return res.status(403).json({ ok: false, error: "Apenas administradores podem remover integrações." });
    }
    const success = await saveIntegrationConfig(clinicId, provider, null);
    
    if (success) {
      return res.json({ ok: true, message: "Credentials removed successfully" });
    } else {
      return res.status(500).json({ ok: false, error: "Failed to remove credentials" });
    }
  });

  // POST Test
  router.post(`/${routeName}/test`, async (req, res) => {
    if (["rd_station", "memed", "meta_pixel"].includes(provider)) {
      return res.status(501).json({ ok: false, error: `O adaptador de ${routeName} ainda não está disponível.` });
    }
    const auth = resolveAuthorizedClinicId(req, req.body?.clinicId);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const clinicId = auth.clinicId;
    const config = await getIntegrationConfig(clinicId);
    const credentials = config?.[provider] || null;

    if (!hasConfiguredCredentials(provider, credentials)) {
      return res.status(400).json({
        ok: false,
        message: `Credenciais de ${routeName} não configuradas para esta clínica.`,
      });
    }

    return res.json({
      ok: true,
      message: `Credenciais de ${routeName} validadas para a clínica.`,
    });
  });
});

// Specific RD Station route
router.post("/rdstation/event", (req, res) => {
  return res.status(501).json({ ok: false, error: "O envio para RD Station ainda não está implementado." });
});

// Specific Memed route
router.post("/memed/prescription", (req, res) => {
  return res.status(501).json({ ok: false, error: "A emissão de receita pela Memed ainda não está implementada." });
});

router.post("/tiss/export", (req, res) => {
  try {
    const authClinicId = String(req.user?.clinic_id || req.clinicId || '').trim();
    const requestedClinicId = String(req.body?.clinicId || authClinicId).trim();
    const role = String(req.user?.role || '').toLowerCase();
    if (!authClinicId || (role !== 'super_admin' && requestedClinicId !== authClinicId)) {
      return res.status(403).json({ ok: false, error: 'Acesso negado para outra clínica.' });
    }
    const result = generateTISS(req.body?.claim || {});
    const validation = validateTISS(result.xml);
    if (!validation.valid) return res.status(422).json({ ok: false, error: 'Documento TISS inválido.', details: validation.missing });
    return res.json({
      ok: true,
      transmitted: false,
      simulated: true,
      message: 'XML TISS gerado localmente. A transmissão para a operadora ainda requer adaptador homologado.',
      export: result.xml,
      protocol: result.protocol,
      version: result.version,
      generated_at: result.generatedAt,
    });
  } catch (error) {
    console.error('[TISS] Falha ao gerar XML:', error.message);
    return res.status(422).json({ ok: false, error: 'Não foi possível gerar o XML TISS.' });
  }
});

router.post("/pixel/event", (req, res) => {
  return res.status(501).json({ ok: false, error: "O envio de eventos de Pixel ainda não está implementado." });
});

export default router;
