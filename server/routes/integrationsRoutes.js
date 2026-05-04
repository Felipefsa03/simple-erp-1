import express from 'express';
import crypto from 'crypto';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../config/env.js';
import { supabaseAdmin } from '../services/supabase.js';

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

providers.forEach(provider => {
  const routeName = provider.replace('_', '-');
  
  // GET Credentials
  router.get(`/${routeName}/credentials/:clinicId`, async (req, res) => {
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

    return res.json({
      ok: true,
      connected: true,
      has_credentials: true,
      credentials: config[provider],
      updatedAt: config.updated_at
    });
  });

  // POST Credentials
  router.post(`/${routeName}/credentials`, async (req, res) => {
    const { clinicId: requestedClinicId, ...credentials } = req.body;
    const auth = resolveAuthorizedClinicId(req, requestedClinicId);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const clinicId = auth.clinicId;

    const success = await saveIntegrationConfig(clinicId, provider, credentials);
    
    if (success) {
      return res.json({ ok: true, message: "Credentials saved successfully" });
    } else {
      return res.status(500).json({ ok: false, error: "Failed to save credentials" });
    }
  });

  // DELETE Credentials
  router.delete(`/${routeName}/credentials/:clinicId`, async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const clinicId = auth.clinicId;
    const success = await saveIntegrationConfig(clinicId, provider, null);
    
    if (success) {
      return res.json({ ok: true, message: "Credentials removed successfully" });
    } else {
      return res.status(500).json({ ok: false, error: "Failed to remove credentials" });
    }
  });

  // POST Test
  router.post(`/${routeName}/test`, async (req, res) => {
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
  const { event, email } = req.body;
  if (!event || !email) {
    return res.status(400).json({ ok: false, error: "event and email are required." });
  }

  return res.json({
    ok: true,
    event_id: `rd-${crypto.randomUUID()}`,
    received_at: new Date().toISOString(),
  });
});

// Specific Memed route
router.post("/memed/prescription", (req, res) => {
  const { patient, prescription } = req.body;
  if (!patient?.name || !prescription?.physician_name || !prescription?.medications?.length) {
    return res.status(400).json({
      ok: false,
      error: "patient.name, prescription.physician_name and medications are required.",
    });
  }

  return res.json({
    ok: true,
    prescription_id: `memed-${crypto.randomUUID()}`,
    created_at: new Date().toISOString(),
  });
});

export default router;
