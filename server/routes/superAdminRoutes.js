import express from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { addLog } from '../services/logger.js';
import { getPlanPricesFromConfig } from '../services/paymentGateway.js';

const router = express.Router();

// Preços vindos da configuração global (Sistema Global), com fallback
const getPlanPrices = async () => {
  try {
    const { data } = await supabaseAdmin
      .from("integration_config")
      .select("plan_price_basico,plan_price_profissional,plan_price_premium")
      .eq("clinic_id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();
    return getPlanPricesFromConfig(data);
  } catch (e) {
    return { basico: 17, profissional: 197, premium: 397 };
  }
};

const normalizePlan = (plan) => {
  const map = { basic: "basico", pro: "profissional", ultra: "premium", enterprise: "premium" };
  const normalized = String(plan || "").toLowerCase().trim();
  return map[normalized] || normalized || "basico";
};

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
      .in("clinic_id", clinicIds);

    const userCountMap = {};
    if (userCounts) {
      for (const u of userCounts) {
        userCountMap[u.clinic_id] = (userCountMap[u.clinic_id] || 0) + 1;
      }
    }

    const { data: patientCounts } = await supabaseAdmin
      .from("patients")
      .select("clinic_id")
      .in("clinic_id", clinicIds)
        .is("deleted_at", null);
    const patientCountMap = {};
    for (const patient of patientCounts || []) {
      patientCountMap[patient.clinic_id] = (patientCountMap[patient.clinic_id] || 0) + 1;
    }

    // Build response with enriched data
    const planPrices = await getPlanPrices();
    const enriched = clinics.map(clinic => {
      const admin = adminMap[clinic.id];
      const planName = normalizePlan(clinic.plan);
      const amount = planPrices[planName] || 0;

      return {
        id: clinic.id,
        name: clinic.name || "Sem nome",
        plan: planName,
        status: clinic.status || "trial",
        amount,
        email: clinic.email || admin?.email || "",
        phone: clinic.phone || admin?.phone || "",
        cnpj: clinic.cnpj || "",
        users_count: userCountMap[clinic.id] || 0,
        patients_count: patientCountMap[clinic.id] || 0,
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
    return res.status(500).json({ ok: false, error: "Não foi possível carregar as clínicas." });
  }
});

router.patch("/clinics/:clinicId", requireAuth, requireSuperAdmin, async (req, res) => {
  const clinicId = String(req.params?.clinicId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)) {
    return res.status(400).json({ ok: false, error: "clinicId inválido." });
  }
  const updates = {};
  if (req.body?.status !== undefined) {
    const status = String(req.body.status).toLowerCase();
    if (!new Set(["trial", "active", "blocked", "suspended", "cancelled"]).has(status)) {
      return res.status(400).json({ ok: false, error: "Status inválido." });
    }
    updates.status = status;
  }
  if (req.body?.plan !== undefined) {
    const plan = String(req.body.plan).toLowerCase();
    if (!new Set(["basico", "profissional", "premium"]).has(plan)) {
      return res.status(400).json({ ok: false, error: "Plano inválido." });
    }
    updates.plan = plan;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ ok: false, error: "Nenhuma alteração válida informada." });
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from("clinics").update(updates).eq("id", clinicId).select("id,status,plan").maybeSingle();
  if (error) {
    console.error("[SuperAdmin] Falha ao atualizar clínica:", error.message);
    return res.status(500).json({ ok: false, error: "Não foi possível atualizar a clínica." });
  }
  if (!data) return res.status(404).json({ ok: false, error: "Clínica não encontrada." });
  addLog(`[SuperAdmin] ${req.user.id} atualizou clínica ${clinicId}: ${JSON.stringify(updates)}`);
  return res.json({ ok: true, clinic: data });
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

    const { data: updated, error } = await supabaseAdmin
      .from("clinics")
      .update(updatePayload)
      .eq("id", clinicId)
      .select("id")
      .single();

    if (error) {
      console.error("[SuperAdmin] Failed to confirm payment:", error.message);
      return res.status(500).json({ ok: false, error: "Não foi possível confirmar o pagamento." });
    }
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Clínica não encontrada" });
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
    return res.status(500).json({ ok: false, error: "Não foi possível confirmar o pagamento." });
  }
});

export default router;
