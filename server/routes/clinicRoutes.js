import express from "express";

export const createClinicRoutes = ({
  requireAuth,
  isUuid,
  GLOBAL_CLINIC_ID,
  createSupabaseAuthUser,
  upsertClinicTeamUser,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
}) => {
  const router = express.Router();

  router.post("/users", requireAuth, async (req, res) => {
    console.log('[POST /api/clinic/users] Request received');
    console.log('[POST /api/clinic/users] req.user:', JSON.stringify(req.user));
    try {
      const actor = req.user || {};
      const actorRole = String(actor.role || "").toLowerCase();
      const canManageUsers =
        actorRole === "admin" || actorRole === "super_admin" || actorRole === "owner";

      console.log('[POST /api/clinic/users] actorRole:', actorRole, 'canManageUsers:', canManageUsers);

      if (!canManageUsers) {
        console.log('[POST /api/clinic/users] Forbidden - insufficient permissions');
        return res
          .status(403)
          .json({ ok: false, error: "Sem permissão para criar usuários" });
      }

      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const name = String(req.body?.name || "").trim();
      const phone = String(req.body?.phone || "").trim();
      const role = String(req.body?.role || "receptionist").trim();
      const commissionPct = Number(req.body?.commission_pct || 0);
      const requestedClinicId = String(req.body?.clinic_id || "").trim();

      console.log('[POST /api/clinic/users] email:', email, 'name:', name);

      if (!email || !password || !name) {
        console.log('[POST /api/clinic/users] Validation failed - missing required fields');
        return res.status(400).json({
          ok: false,
          error: "email, password e name são obrigatórios",
        });
      }

      if (password.length < 6) {
        console.log('[POST /api/clinic/users] Validation failed - password too short');
        return res
          .status(400)
          .json({ ok: false, error: "Senha deve ter ao menos 6 caracteres." });
      }

      const clinicId =
        actorRole === "super_admin" && isUuid(requestedClinicId)
          ? requestedClinicId
          : isUuid(actor.clinic_id)
            ? actor.clinic_id
            : isUuid(requestedClinicId)
              ? requestedClinicId
              : GLOBAL_CLINIC_ID;

      console.log('[POST /api/clinic/users] clinicId:', clinicId);

      console.log('[POST /api/clinic/users] Calling createSupabaseAuthUser...');
      const authResult = await createSupabaseAuthUser({
        email,
        password,
        name,
      });
      console.log('[POST /api/clinic/users] authResult:', JSON.stringify(authResult));

      console.log('[POST /api/clinic/users] Calling upsertClinicTeamUser...');
      const userResult = await upsertClinicTeamUser({
        userId: authResult.userId,
        clinicId,
        name,
        email,
        phone,
        role,
        commissionPct,
        token: req.token,
      });
      console.log('[POST /api/clinic/users] userResult:', JSON.stringify(userResult));

      return res.json({
        ok: true,
        user_id: userResult.userId,
      });
    } catch (err) {
      console.error("[POST /api/clinic/users] Error:", err.message);
      console.error(err.stack);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Anamnese sync endpoint (PÚBLICO - RLS permite leitura)
  router.get("/anamnese-sync", async (req, res) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.json({ ok: true, items: [] });
      }

      const userClinicId = req.clinicId;
      const userRole = req.user?.role;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/medical_records?select=patient_id,clinic_id,anamnese,updated_at&updated_at=gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&limit=100`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );

      if (!response.ok) {
        return res.json({ ok: true, items: [] });
      }

      const records = await response.json();

      let filteredRecords = records;
      if (userRole !== "admin" && userRole !== "owner") {
        filteredRecords = records.filter((r) => r.clinic_id === userClinicId);
      }

      const items = filteredRecords.map((r) => ({
        patientId: r.patient_id,
        clinicId: r.clinic_id,
        data: { anamnese: r.anamnese },
        submittedAt: r.updated_at,
      }));

      res.json({ ok: true, items });
    } catch (error) {
      res.json({ ok: true, items: [] });
    }
  });

  return router;
};
