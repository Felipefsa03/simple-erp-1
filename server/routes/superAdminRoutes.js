import express from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { addLog } from '../services/logger.js';

const router = express.Router();

// GET /api/super-admin/clinics — List all clinics from Supabase with admin info
router.get("/clinics", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    // Fetch all clinics
    const { data: clinics, error: clinicsErr } = await supabaseAdmin
      .from("clinics")
      .select("*")
      .order("created_at", { ascending: false });

    if (clinicsErr) {
      console.error("[SuperAdmin] Failed to fetch clinics:", clinicsErr.message);
      return res.status(500).json({ ok: false, error: clinicsErr.message });
    }

    if (!clinics || clinics.length === 0) {
      return res.json({ ok: true, data: [] });
    }

    // Fetch admin users for each clinic
    const clinicIds = clinics.map(c => c.id);
    const { data: admins } = await supabaseAdmin
      .from("users")
      .select("clinic_id, name, email, phone")
      .in("clinic_id", clinicIds)
      .eq("role", "admin");

    const adminMap = {};
    if (admins) {
      for (const a of admins) {
        if (!adminMap[a.clinic_id]) adminMap[a.clinic_id] = a;
      }
    }

    // Count users per clinic
    const { data: userCounts } = await supabaseAdmin
      .from("users")
      .select("clinic_id")
      .in("clinic_id", clinicIds)
      .eq("active", true);

    const userCountMap = {};
    if (userCounts) {
      for (const u of userCounts) {
        userCountMap[u.clinic_id] = (userCountMap[u.clinic_id] || 0) + 1;
      }
    }

    // Build response with enriched data
    const enriched = clinics.map(clinic => {
      const admin = adminMap[clinic.id];
      const planPrices = { basico: 197, profissional: 397, premium: 697 };
      const planName = String(clinic.plan || "basico").toLowerCase();
      const amount = planPrices[planName] || 0;

      return {
        id: clinic.id,
        name: clinic.name || "Sem nome",
        plan: clinic.plan || "basico",
        status: clinic.status || "trial",
        amount,
        email: clinic.email || admin?.email || "",
        phone: clinic.phone || admin?.phone || "",
        cnpj: clinic.cnpj || "",
        users_count: userCountMap[clinic.id] || 0,
        created_at: clinic.created_at,
        expires_at: clinic.expires_at || null,
        last_payment_at: clinic.last_payment_at || null,
        admin_name: admin?.name || "",
        admin_email: admin?.email || "",
      };
    });

    return res.json({ ok: true, data: enriched });
  } catch (error) {
    console.error("[SuperAdmin] Error in GET /clinics:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/super-admin/confirm-payment — Manually confirm a monthly payment
router.post("/confirm-payment", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const clinicId = String(req.body?.clinic_id || "").trim();
    if (!clinicId) {
      return res.status(400).json({ ok: false, error: "clinic_id é obrigatório" });
    }

    // Calculate next billing date (30 days from now)
    const now = new Date();
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updatePayload = {
      status: "active",
      expires_at: nextBilling.toISOString(),
      last_payment_at: now.toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("clinics")
      .update(updatePayload)
      .eq("id", clinicId);

    if (error) {
      console.error("[SuperAdmin] Failed to confirm payment:", error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }

    addLog(`[SuperAdmin] Pagamento confirmado manualmente para clínica ${clinicId}. Próxima cobrança: ${nextBilling.toLocaleDateString('pt-BR')}`);

    return res.json({
      ok: true,
      clinic_id: clinicId,
      next_billing_date: nextBilling.toISOString(),
      last_payment_at: now.toISOString(),
    });
  } catch (error) {
    console.error("[SuperAdmin] Error in confirm-payment:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
