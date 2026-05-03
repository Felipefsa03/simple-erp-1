import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/env.js";

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  
  if (!token) {
    return res
      .status(401)
      .json({ ok: false, error: "Token de autenticação ausente" });
  }

  // Validate JWT format before calling Supabase
  const jwtParts = token.split(".");
  if (jwtParts.length !== 3) {
    console.error("[Auth] Invalid JWT format:", jwtParts.length, "parts");
    return res
      .status(401)
      .json({ ok: false, error: "Token mal formado" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    req.user = { id: "dev-user", role: "admin", clinic_id: "dev-clinic" };
    return next();
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!userRes.ok) {
      const errorData = await userRes.json().catch(() => ({}));
      console.error("[Auth] Supabase error:", errorData);
      return res
        .status(401)
        .json({ ok: false, error: "Token inválido ou expirado" });
    }

    const userData = await userRes.json();

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userData.id}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (profileRes.ok) {
      const profiles = await profileRes.json();
      req.user = profiles[0] || { id: userData.id, role: "receptionist" };
    } else {
      req.user = { id: userData.id, role: "receptionist" };
    }

    req.token = token;
    req.clinicId = req.user.clinic_id;
    next();
  } catch (error) {
    console.error("[Auth] Error validating token:", error.message);
    return res.status(401).json({ ok: false, error: "Erro na autenticação" });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Autenticação requerida" });
  }

  if (req.user.role !== "super_admin") {
    console.warn(`[Auth] Acesso super_admin negado para user ${req.user.id}`);
    return res
      .status(403)
      .json({ ok: false, error: "Acesso restrito a super_admin" });
  }

  next();
};

export const require2FAPermission = (req, res, next) => {
  const requestedUserId = req.body.userId || req.query.userId;
  const isSuperAdmin = req.user?.role === "super_admin";

  if (!requestedUserId) {
    return res.status(400).json({ ok: false, error: "userId é obrigatório" });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Autenticação requerida" });
  }

  if (requestedUserId !== req.user.id && !isSuperAdmin) {
    return res.status(403).json({
      ok: false,
      error: "Não autorizado a gerenciar 2FA de outro usuário",
    });
  }

  next();
};
