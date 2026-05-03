import express from "express";

export const createPublicRoutes = ({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  supabaseAdmin,
  isUuid,
  SYSTEM_WHATSAPP_CLINIC_ID
}) => {
  const router = express.Router();

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
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
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
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
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

  router.post("/clinic/:clinicId/booking", async (req, res) => {
    const { clinicId } = req.params;
    const { name, phone, email, service_id, professional_id, date, time, notes } = req.body;

    if (!isUuid(clinicId)) {
      return res.status(400).json({ ok: false, error: "ID de clínica inválido" });
    }
    console.log(`[Public Booking] Request received for clinic: ${clinicId}`);
    console.log(`[Public Booking] Body:`, JSON.stringify(req.body));

    if (!name || !phone || !email || !date || !time) {
      return res.status(400).json({ ok: false, error: "Campos obrigatórios ausentes", received: { name: !!name, phone: !!phone, email: !!email, date: !!date, time: !!time } });
    }

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      
      // ====================================================
      // SOLUÇÃO DEFINITIVA: Usar RPC com SECURITY DEFINER
      // Isso bypassa TODAS as travas RLS do banco de dados
      // independente de qual chave (anon ou service) é usada
      // ====================================================
      console.log(`[Public Booking] Calling RPC public_create_booking...`);
      
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_create_booking`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_clinic_id: clinicId,
          p_name: name,
          p_phone: cleanPhone,
          p_email: email.toLowerCase(),
          p_service_id: (service_id && service_id.trim() !== '') ? service_id : null,
          p_professional_id: (professional_id && professional_id.trim() !== '') ? professional_id : null,
          p_date: date,
          p_time: time,
          p_notes: notes || 'Agendamento Online'
        })
      });

      const result = await rpcRes.json();
      console.log(`[Public Booking] RPC Response:`, JSON.stringify(result));

      if (!result || result.ok === false) {
        console.error("[Public Booking] RPC Error:", result);
        return res.status(400).json({ 
          ok: false, 
          error: result?.error || "Erro ao processar agendamento",
          details: result
        });
      }

      // WhatsApp Notification (Safe - fire and forget)
      const waUrl = process.env.WHATSAPP_API_URL;
      const waClinicId = SYSTEM_WHATSAPP_CLINIC_ID;
      
      if (waUrl && waClinicId) {
        console.log(`[Public Booking] Sending WA notification...`);
        const waMessage = `*Novo Agendamento Online*\n\nPaciente: ${name}\nData: ${date}\nHora: ${time}`;
        fetch(`${waUrl}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId: waClinicId, to: cleanPhone, message: waMessage })
        }).catch(err => console.log("[Public Booking] WA Notify failed:", err.message));
      } else {
        console.log(`[Public Booking] WA notification skipped`);
      }

      console.log(`[Public Booking] SUCCESS - Patient: ${result.patient_id}, Appointment: ${result.appointment_id}`);
      res.json({
        ok: true,
        appointment: { id: result.appointment_id, patient_id: result.patient_id, scheduled: result.scheduled }
      });
    } catch (error) {
      console.error("[Public Booking] CRITICAL ERROR:", error);
      res.status(500).json({ 
        ok: false, 
        error: "Falha interna no servidor", 
        message: error.message
      });
    }
  });

  return router;
};
