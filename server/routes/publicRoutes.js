import express from "express";

export const createPublicRoutes = ({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  supabaseAdmin,
  isUuid,
  SYSTEM_WHATSAPP_CLINIC_ID
}) => {
  const router = express.Router();

  // Booking público consulta o banco com a chave de servidor (service role):
  // mantém o booking funcionando mesmo com RLS ativo nas tabelas.
  const serverHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`
  };

  const GLOBAL_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

  // Preços dos planos configurados pelo super admin (Sistema Global).
  // Público: retorna SOMENTE os preços, nunca segredos.
  router.get("/system/signup-config", async (_req, res) => {
    try {
      const url = `${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.${GLOBAL_CLINIC_ID}&select=plan_price_basico,plan_price_profissional,plan_price_premium&limit=1`;
      const cfgRes = await fetch(url, { headers: serverHeaders });
      const rows = cfgRes.ok ? await cfgRes.json() : [];
      const cfg = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      const parsePrice = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : fallback;
      };

      return res.json({
        ok: true,
        plan_prices: {
          basico: parsePrice(cfg?.plan_price_basico, 97),
          profissional: parsePrice(cfg?.plan_price_profissional, 197),
          premium: parsePrice(cfg?.plan_price_premium, 397),
        },
      });
    } catch (error) {
      console.error("[Public API] Erro ao buscar preços:", error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/clinic/:clinicId/booking-info", async (req, res) => {
    const { clinicId } = req.params;

    if (!isUuid(clinicId)) {
      return res.status(400).json({ ok: false, error: "ID de clínica inválido" });
    }

    try {
      // 1. Fetch Clinic info using direct fetch (matching frontend successful behavior)
      console.log(`[Public API] Fetching clinic info via direct fetch for ID: ${clinicId}`);
      const clinicUrl = `${SUPABASE_URL}/rest/v1/clinics?id=eq.${clinicId}&select=name`;
      const clinicRes = await fetch(clinicUrl, {
        headers: serverHeaders
      });

      if (!clinicRes.ok) {
        const errText = await clinicRes.text();
        return res.status(clinicRes.status).json({ 
          ok: false, 
          error: `Erro ao buscar clínica no Supabase (${clinicRes.status})`,
          details: errText
        });
      }

      const clinics = await clinicRes.json();
      const clinic = clinics?.[0];

      if (!clinic) {
        return res.status(404).json({ 
          ok: false, 
          error: "Clínica não encontrada no banco de dados do servidor",
          details: "O ID existe no frontend mas não foi retornado pelo Supabase no backend. Verifique a URL do Supabase no Render."
        });
      }

      // 2. Fetch services using direct fetch
      const servicesUrl = `${SUPABASE_URL}/rest/v1/services?clinic_id=eq.${clinicId}&deleted_at=is.null&select=id,name&order=name.asc`;
      const servicesRes = await fetch(servicesUrl, {
        headers: serverHeaders
      });
      const services = (await servicesRes.json()) || [];

      // 3. Fetch professionals with names and roles, filtering for Dentists/Estheticians
      const { data: professionalsRaw, error: profsError } = await supabaseAdmin
        .from('professionals')
        .select('id, user:user_id(name, role)')
        .eq('clinic_id', clinicId)
        .eq('active', true);
      
      // Log available roles for debugging (visible in Render logs)
      if (professionalsRaw) {
        const roles = [...new Set(professionalsRaw.map(p => p.user?.role))];
        console.log(`[Public API] Available roles in clinic ${clinicId}:`, roles);
      }

      let filteredProfs = (professionalsRaw || []).filter(p => {
        const role = (p.user?.role || '').toLowerCase();
        return role.includes('dentista') || role.includes('esteticista') || role.includes('dentist');
      });

      // Fallback: If filter is too strict and returns nothing, show all to avoid blank list
      if (filteredProfs.length === 0 && (professionalsRaw || []).length > 0) {
        console.warn("[Public API] Role filter returned 0 results, falling back to all professionals");
        filteredProfs = professionalsRaw;
      }

      const professionals = filteredProfs.map(p => ({
        id: p.id,
        name: p.user?.name || "Profissional"
      }));

      res.json({
        ok: true,
        clinic,
        services,
        professionals,
      });

    } catch (error) {
      console.error("[Public API] Error fetching booking info:", error);
      res.status(500).json({ ok: false, error: "Erro interno ao buscar informações", message: error.message });
    }
  });

  // Anti-spam do booking público: máximo 5 agendamentos por IP a cada 15 min
  const bookingRateByIp = new Map();
  const BOOKING_WINDOW_MS = 15 * 60 * 1000;
  const BOOKING_MAX_PER_WINDOW = 5;

  router.post("/clinic/:clinicId/booking", async (req, res) => {
    const { clinicId } = req.params;
    const { name, phone, email, service_id, professional_id, date, time, notes } = req.body;

    if (!isUuid(clinicId)) {
      return res.status(400).json({ ok: false, error: "ID de clínica inválido" });
    }

    // Rate limit por IP
    const ip = String(req.ip || "unknown");
    const nowMs = Date.now();
    const recent = (bookingRateByIp.get(ip) || []).filter((t) => nowMs - t < BOOKING_WINDOW_MS);
    if (recent.length >= BOOKING_MAX_PER_WINDOW) {
      return res.status(429).json({ ok: false, error: "Muitos agendamentos. Tente novamente mais tarde." });
    }

    if (!name || !phone || !email || !date || !time) {
      return res.status(400).json({ ok: false, error: "Campos obrigatórios ausentes", received: { name: !!name, phone: !!phone, email: !!email, date: !!date, time: !!time } });
    }

    // Validação de tamanho/formatos (anti-abuso)
    const safeName = String(name).slice(0, 80).replace(/\r?\n/g, " ").trim();
    const safeNotes = String(notes || "").slice(0, 300).replace(/\r?\n/g, " ").trim();
    const safeEmail = String(email).slice(0, 120).trim().toLowerCase();
    const safePhone = String(phone).replace(/\D/g, "").slice(0, 13);
    if (!safeName || !safeEmail || safePhone.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time))) {
      return res.status(400).json({ ok: false, error: "Dados inválidos para agendamento." });
    }

    try {
      const cleanPhone = safePhone;

      // ====================================================
      // SOLUÇÃO DEFINITIVA: Usar RPC com SECURITY DEFINER
      // Isso bypassa TODAS as travas RLS do banco de dados
      // independente de qual chave (anon ou service) é usada
      // ====================================================

      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_create_booking`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_clinic_id: clinicId,
          p_name: safeName,
          p_phone: cleanPhone,
          p_email: safeEmail,
          p_service_id: (service_id && String(service_id).trim() !== '') ? service_id : null,
          p_professional_id: (professional_id && String(professional_id).trim() !== '') ? professional_id : null,
          p_date: date,
          p_time: time,
          p_notes: safeNotes || 'Agendamento Online'
        })
      });

      const result = await rpcRes.json();

      if (!result || result.ok === false) {
        return res.status(400).json({
          ok: false,
          error: result?.error || "Erro ao processar agendamento",
        });
      }

      // Registra o agendamento no rate limit só após sucesso
      recent.push(nowMs);
      bookingRateByIp.set(ip, recent);

      // WhatsApp Notification (Safe - fire and forget)
      const waUrl = process.env.WHATSAPP_API_URL;
      const waClinicId = SYSTEM_WHATSAPP_CLINIC_ID;

      if (waUrl && waClinicId) {
        const waMessage = `*Novo Agendamento Online*\n\nPaciente: ${safeName}\nData: ${date}\nHora: ${time}`;
        fetch(`${waUrl}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId: waClinicId, to: cleanPhone, message: waMessage })
        }).catch(err => console.log("[Public Booking] WA Notify failed:", err.message));
      }

      res.json({
        ok: true,
        appointment: { id: result.appointment_id, patient_id: result.patient_id, scheduled: result.scheduled }
      });
    } catch (error) {
      console.error("[Public Booking] CRITICAL ERROR:", error);
      res.status(500).json({
        ok: false,
        error: "Falha interna no servidor",
      });
    }
  });

  return router;
};
