import express from 'express';

const allowedRoles = new Set(['admin', 'owner', 'super_admin']);

const safeProvider = (value) => {
  return String(value || 'focus_nfe').toLowerCase() === 'focus_nfe' ? 'focus_nfe' : 'focus_nfe';
};

const providerUrl = (config) => {
  if (safeProvider(config.provider) !== 'focus_nfe') return null;
  return config.environment === 'producao' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br';
};

const providerHeaders = (config) => ({
  Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
  'Content-Type': 'application/json',
});

export const createNFeRoutes = ({ supabaseAdmin, requireAuth }) => {
  const router = express.Router();

  const persistEmission = async ({ clinicId, reference, config, requestPayload = null, responsePayload = {}, status }) => {
    try {
      const { error } = await supabaseAdmin.from('nfe_emissions').upsert({
        clinic_id: clinicId,
        reference,
        provider: safeProvider(config?.provider),
        environment: config?.environment === 'producao' ? 'producao' : 'homologacao',
        request_payload: requestPayload,
        response_payload: responsePayload,
        status: String(status || 'unknown').slice(0, 40),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'clinic_id,reference' });
      if (error) {
        // A falha de persistência não transforma uma autorização oficial em
        // falsa, mas precisa ser visível para operação e auditoria.
        console.error('[NFe] Falha ao persistir retorno fiscal:', error.message);
      }
    } catch (error) {
      console.error('[NFe] Exceção ao persistir retorno fiscal:', error.message);
    }
  };

  const clinicForRequest = (req, requested) => {
    const role = String(req.user?.role || '').toLowerCase();
    const own = String(req.user?.clinic_id || req.clinicId || '').trim();
    const target = String(requested || own).trim();
    if (!target) return { ok: false, status: 401, error: 'Contexto de clínica ausente.' };
    if (role !== 'super_admin' && target !== own) return { ok: false, status: 403, error: 'Acesso negado para outra clínica.' };
    return { ok: true, clinicId: target, role };
  };

  const loadConfig = async (clinicId) => {
    const { data, error } = await supabaseAdmin.from('integration_config').select('nfe_config').eq('clinic_id', clinicId).maybeSingle();
    if (error) throw error;
    const config = data?.nfe_config;
    if (!config?.apiKey || !config?.cnpj) return null;
    return config;
  };

  const publicConfig = (config) => config ? {
    provider: safeProvider(config.provider),
    environment: config.environment === 'producao' ? 'producao' : 'homologacao',
    cnpj: config.cnpj,
    ie: config.ie || '',
    razaoSocial: config.razaoSocial || '',
    configured: Boolean(config.apiKey && config.cnpj),
  } : { configured: false };

  router.get('/config', requireAuth, async (req, res) => {
    const auth = clinicForRequest(req, req.query.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    try {
      return res.json({ ok: true, config: publicConfig(await loadConfig(auth.clinicId)) });
    } catch (error) {
      console.error('[NFe] Falha ao carregar configuração:', error.message);
      return res.status(500).json({ ok: false, error: 'Não foi possível carregar a configuração fiscal.' });
    }
  });

  router.post('/config', requireAuth, async (req, res) => {
    const auth = clinicForRequest(req, req.body?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!allowedRoles.has(auth.role)) return res.status(403).json({ ok: false, error: 'Apenas administradores podem configurar a emissão fiscal.' });
    const incoming = req.body?.config || {};
    let existingConfig = null;
    try { existingConfig = await loadConfig(auth.clinicId); } catch (_) { existingConfig = null; }
    const apiKey = String(incoming.apiKey || existingConfig?.apiKey || '').trim();
    if (!apiKey || !String(incoming.cnpj || '').trim() || !String(incoming.razaoSocial || '').trim()) {
      return res.status(400).json({ ok: false, error: 'API Key, CNPJ e Razão Social são obrigatórios.' });
    }
    const config = {
      ...incoming,
      provider: safeProvider(incoming.provider),
      environment: incoming.environment === 'producao' ? 'producao' : 'homologacao',
      apiKey,
    };
    try {
      const { error } = await supabaseAdmin.from('integration_config').upsert({
        clinic_id: auth.clinicId,
        nfe_config: config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'clinic_id' });
      if (error) throw error;
      return res.json({ ok: true, config: publicConfig(config) });
    } catch (error) {
      console.error('[NFe] Falha ao salvar configuração:', error.message);
      return res.status(500).json({ ok: false, error: 'Não foi possível salvar a configuração fiscal.' });
    }
  });

  router.post('/test', requireAuth, async (req, res) => {
    const auth = clinicForRequest(req, req.body?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    try {
      const config = await loadConfig(auth.clinicId);
      if (!config) return res.status(400).json({ ok: false, error: 'NF-e não configurada para esta clínica.' });
      const base = providerUrl(config);
      if (!base) return res.status(501).json({ ok: false, error: 'Este provedor ainda não possui adaptador de servidor.' });
      const response = await fetch(`${base}/v2/nfe?limit=1`, { headers: providerHeaders(config) });
      if (!response.ok) return res.status(502).json({ ok: false, error: 'O provedor rejeitou as credenciais.' });
      return res.json({ ok: true, configured: true });
    } catch (error) {
      console.error('[NFe] Teste falhou:', error.message);
      return res.status(502).json({ ok: false, error: 'Não foi possível conectar ao provedor fiscal.' });
    }
  });

  router.post('/emitir', requireAuth, async (req, res) => {
    const auth = clinicForRequest(req, req.body?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!allowedRoles.has(auth.role)) return res.status(403).json({ ok: false, error: 'Apenas administradores podem emitir NF-e.' });
    try {
      const config = await loadConfig(auth.clinicId);
      const base = config && providerUrl(config);
      if (!base) return res.status(501).json({ ok: false, error: 'Provedor fiscal não configurado ou ainda não suportado.' });
      const ref = String(req.query.ref || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      if (!ref) return res.status(400).json({ ok: false, error: 'Referência fiscal inválida.' });
      const response = await fetch(`${base}/v2/nfe?ref=${encodeURIComponent(ref)}`, {
        method: 'POST', headers: providerHeaders(config), body: JSON.stringify(req.body?.payload || {}),
      });
      const data = await response.json().catch(() => ({}));
      await persistEmission({
        clinicId: auth.clinicId,
        reference: ref,
        config,
        requestPayload: req.body?.payload || {},
        responsePayload: data,
        status: response.ok ? (data?.status || data?.situacao || 'submitted') : 'error',
      });
      return res.status(response.ok ? 200 : 502).json(data);
    } catch (error) {
      console.error('[NFe] Emissão falhou:', error.message);
      return res.status(502).json({ ok: false, error: 'Falha de comunicação com o provedor fiscal.' });
    }
  });

  router.get('/consultar/:ref', requireAuth, async (req, res) => {
    const auth = clinicForRequest(req, req.query.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    try {
      const config = await loadConfig(auth.clinicId);
      const base = config && providerUrl(config);
      if (!base) return res.status(501).json({ ok: false, error: 'Provedor fiscal não configurado ou ainda não suportado.' });
      const ref = String(req.params.ref || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      const response = await fetch(`${base}/v2/nfe/${encodeURIComponent(ref)}`, { headers: providerHeaders(config) });
      const data = await response.json().catch(() => ({}));
      await persistEmission({
        clinicId: auth.clinicId,
        reference: ref,
        config,
        responsePayload: data,
        status: response.ok ? (data?.status || data?.situacao || 'consulted') : 'error',
      });
      return res.status(response.ok ? 200 : 502).json(data);
    } catch (error) {
      console.error('[NFe] Consulta falhou:', error.message);
      return res.status(502).json({ ok: false, error: 'Falha de comunicação com o provedor fiscal.' });
    }
  });

  router.delete('/cancelar/:ref', requireAuth, async (req, res) => {
    const auth = clinicForRequest(req, req.query.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!allowedRoles.has(auth.role)) return res.status(403).json({ ok: false, error: 'Apenas administradores podem cancelar NF-e.' });
    try {
      const config = await loadConfig(auth.clinicId);
      const base = config && providerUrl(config);
      if (!base) return res.status(501).json({ ok: false, error: 'Provedor fiscal não configurado ou ainda não suportado.' });
      const ref = String(req.params.ref || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      const response = await fetch(`${base}/v2/nfe/${encodeURIComponent(ref)}`, {
        method: 'DELETE', headers: providerHeaders(config), body: JSON.stringify({ justificativa: String(req.body?.justificativa || '').slice(0, 255) }),
      });
      const data = await response.json().catch(() => ({}));
      await persistEmission({
        clinicId: auth.clinicId,
        reference: ref,
        config,
        requestPayload: { justificativa: String(req.body?.justificativa || '').slice(0, 255) },
        responsePayload: data,
        status: response.ok ? 'cancelled' : 'error',
      });
      return res.status(response.ok ? 200 : 502).json(data);
    } catch (error) {
      console.error('[NFe] Cancelamento falhou:', error.message);
      return res.status(502).json({ ok: false, error: 'Falha de comunicação com o provedor fiscal.' });
    }
  });

  return router;
};
