import express from "express";
import crypto from "crypto";

export const createClinicRoutes = ({
  requireAuth,
  isUuid,
  GLOBAL_CLINIC_ID,
  createSupabaseAuthUser,
  upsertClinicTeamUser,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ANAMNESE_TOKEN_SECRET,
  supabaseAdmin
}) => {
  const router = express.Router();

  const encodeToken = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', ANAMNESE_TOKEN_SECRET || 'development-only-anamnese-secret').update(body).digest('base64url');
    return `${body}.${signature}`;
  };

  const canManageAnamnese = (req) => ['admin', 'owner', 'super_admin', 'professional', 'dentist'].includes(String(req.user?.role || '').toLowerCase());

  router.post("/anamnese-links", requireAuth, async (req, res) => {
    if (!canManageAnamnese(req)) return res.status(403).json({ ok: false, error: "Sem permissão para gerar link de anamnese." });
    const patientId = String(req.body?.patientId || '').trim();
    const clinicId = String(req.clinicId || '').trim();
    const hours = Math.min(168, Math.max(1, Number(req.body?.hoursValid || 72)));
    if (!isUuid(patientId) || !isUuid(clinicId)) return res.status(400).json({ ok: false, error: "Paciente ou clínica inválidos." });

    try {
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('patients').select('id, clinic_id').eq('id', patientId).eq('clinic_id', clinicId).maybeSingle();
      if (patientError || !patient) return res.status(404).json({ ok: false, error: "Paciente não encontrado." });

      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      const jti = crypto.randomUUID();
      const token = encodeToken({ p: patientId, c: clinicId, e: expiresAt.toISOString(), j: jti });
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const { error } = await supabaseAdmin.from('anamnese_public_tokens').insert({
        jti, token_hash: tokenHash, patient_id: patientId, clinic_id: clinicId,
        expires_at: expiresAt.toISOString(), created_by: req.user.id,
      });
      if (error) throw error;
      return res.json({ ok: true, token, patient_id: patientId, clinic_id: clinicId, expires_at: expiresAt.toISOString() });
    } catch (error) {
      console.error('[AnamneseLink] Erro:', error.message);
      return res.status(500).json({ ok: false, error: 'Não foi possível gerar o link de anamnese.' });
    }
  });

  router.post("/users", requireAuth, async (req, res) => {
    console.log('[POST /api/clinic/users] Request received');
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
      const requestedRole = String(req.body?.role || "receptionist").trim().toLowerCase();
      const commissionPct = Number(req.body?.commission_pct || 0);
      const requestedClinicId = String(req.body?.clinic_id || "").trim();

      // Allowlist: clínica NÃO pode criar super_admin/owner via esta rota.
      // Apenas super_admin pode atribuir qualquer role (exceto super_admin).
      const clinicRoles = new Set(["receptionist", "dentist", "professional", "admin"]);
      const role = actorRole === "super_admin"
        ? (clinicRoles.has(requestedRole) ? requestedRole : "receptionist")
        : (requestedRole === "admin" || requestedRole === "dentist" || requestedRole === "professional"
            ? requestedRole
            : "receptionist");

      console.log('[POST /api/clinic/users] Creating clinic team user');

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

      console.log('[POST /api/clinic/users] Calling createSupabaseAuthUser...');
      const authResult = await createSupabaseAuthUser({
        email,
        password,
        name,
      });
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

      return res.json({
        ok: true,
        user_id: userResult.userId,
      });
    } catch (err) {
      console.error("[POST /api/clinic/users] Error:", err.message);
      console.error(err.stack);
      return res.status(500).json({ ok: false, error: "Não foi possível criar o usuário." });
    }
  });

  // Anamnese sync endpoint (autenticado)
  router.get("/anamnese-sync", requireAuth, async (req, res) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(503).json({ ok: false, error: "Sincronização de anamnese indisponível." });
      }

      const userClinicId = String(req.clinicId || "").trim();
      const userRole = String(req.user?.role || "").toLowerCase();
      const isSuperAdmin = userRole === "super_admin";

      if (!isSuperAdmin && !userClinicId) {
        return res.status(401).json({ ok: false, error: "Contexto de clínica ausente na sessão." });
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const clinicFilter = !isSuperAdmin ? `&clinic_id=eq.${encodeURIComponent(userClinicId)}` : "";

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/medical_records?select=patient_id,clinic_id,anamnese,updated_at&updated_at=gte.${since}${clinicFilter}&limit=100`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );

      if (!response.ok) {
        return res.status(502).json({ ok: false, error: "Falha ao consultar anamneses." });
      }

      const records = await response.json();
      const filteredRecords = Array.isArray(records) ? records : [];

      const items = filteredRecords.map((r) => ({
        patientId: r.patient_id,
        clinicId: r.clinic_id,
        data: { anamnese: r.anamnese },
        submittedAt: r.updated_at,
      }));

      res.json({ ok: true, items });
    } catch (error) {
      console.error("[AnamneseSync] Erro:", error.message);
      res.status(500).json({ ok: false, error: "Falha ao sincronizar anamneses." });
    }
  });

  return router;
};
