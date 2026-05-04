import { supabaseAdmin } from "./supabase.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from "../config/env.js";
import { getVerificationSession, setVerificationSession } from "./sessionStore.js";

const SUPABASE_SERVICE_ROLE_KEY_RAW = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SIGNUP_VERIFIED_TTL_MS = 15 * 60 * 1000;
const sanitizePlan = (p) => {
  if (!p) return "basico";
  const allowed = new Set(["basico", "profissional", "premium"]);
  return allowed.has(String(p)) ? String(p) : "basico";
};
const normalizePhoneForSignup = (p) => String(p || "").replace(/\D/g, "");
const encodeFilterValue = (value) => encodeURIComponent(String(value).trim());

// Funções Helpers originais do index.js necessárias
const safeJson = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw_text: text };
  }
};

const isValidSupabaseKey = (key) => {
  if (!key || typeof key !== "string") return false;
  const parts = key.split(".");
  return parts.length === 3;
};

const getSupabaseAdminHeaders = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});

const getSupabaseWriteHeaders = (token) => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});


const fetchUserByEmail = async (email) => {
  if (!email) return null;
  const normalizedEmail = String(email).trim().toLowerCase();
  
  try {
    // 1. Tentar primeiro na tabela 'users' (Principal)
    const urlUsers = `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeFilterValue(normalizedEmail)}&select=id,clinic_id,email,name,role,phone&limit=1`;
    const resUsers = await fetch(urlUsers, { headers: getSupabaseAdminHeaders() });
    
    if (resUsers.ok) {
      const users = await resUsers.json();
      if (Array.isArray(users) && users.length > 0) {
        console.log(`[fetchUserByEmail] Encontrado em 'users': ${normalizedEmail}`);
        return users[0];
      }
    }
    
    // 2. Fallback: Tentar na tabela 'professionals'
    const urlProfs = `${SUPABASE_URL}/rest/v1/professionals?email=eq.${encodeFilterValue(normalizedEmail)}&select=id,user_id,clinic_id,name,phone,email&limit=1`;
    const resProfs = await fetch(urlProfs, { headers: getSupabaseAdminHeaders() });
    
    if (resProfs.ok) {
      const profs = await resProfs.json();
      if (Array.isArray(profs) && profs.length > 0) {
        const p = profs[0];
        console.log(`[fetchUserByEmail] Encontrado em 'professionals': ${normalizedEmail}`);
        return {
          id: p.user_id || p.id,
          clinic_id: p.clinic_id,
          email: p.email || normalizedEmail,
          name: p.name,
          phone: p.phone,
          role: 'dentist'
        };
      }
    }
  } catch (error) {
    console.error(`[fetchUserByEmail] Erro ao buscar usuário ${email}:`, error);
  }
  
  console.log(`[fetchUserByEmail] Usuário não encontrado em nenhuma tabela: ${normalizedEmail}`);
  return null;
};

const fetchClinicById = async (clinicId) => {
  if (!clinicId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("clinics")
      .select("id,name,plan,active")
      .eq("id", clinicId)
      .maybeSingle();
    if (error) {
      console.warn('[fetchClinicById] Failed:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[fetchClinicById] Exception:', e.message);
    return null;
  }
};

const findAuthUserIdByEmail = async (email) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !email) return null;
  const url = `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const response = await fetch(url, {
    headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY),
  });
  if (!response.ok) return null;
  const payload = await safeJson(response);
  const users = payload?.users || [];
  const found = users.find(
    (user) => String(user?.email || "").toLowerCase() === email.toLowerCase(),
  );
  return found?.id || null;
};

const createSupabaseAuthUser = async ({ email, password, name }) => {
  console.log('[createSupabaseAuthUser] Starting with email:', email);
  console.log('[createSupabaseAuthUser] SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('[createSupabaseAuthUser] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  console.log('[createSupabaseAuthUser] SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[createSupabaseAuthUser] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    throw new Error(
      "SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY ausentes para provisionamento.",
    );
  }

  if (SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes(".")) {
    throw new Error(
      "Para criar usuários, a API Auth do Supabase exige a chave 'service_role' no formato JWT antigo. Vá em 'Project Settings -> API -> Legacy anon, service_role API keys' no Supabase, copie a chave 'service_role' (começa com eyJhb...) e atualize a variável SUPABASE_SERVICE_ROLE_KEY no Render."
    );
  }

  if (SUPABASE_SERVICE_ROLE_KEY_RAW && !isValidSupabaseKey(SUPABASE_SERVICE_ROLE_KEY_RAW)) {
    throw new Error(
      "A chave SUPABASE_SERVICE_ROLE_KEY no backend (Render) é inválida. Verifique se copiou corretamente."
    );
  }

  if (SUPABASE_ANON_KEY && !isValidSupabaseKey(SUPABASE_ANON_KEY)) {
    throw new Error(
      "A chave SUPABASE_ANON_KEY no backend (Render) é inválida. Por favor, verifique as variáveis de ambiente.",
    );
  }

  // Segurança: criação de usuário no Auth exige service_role no backend.
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Provisionamento de usuários bloqueado: SUPABASE_SERVICE_ROLE_KEY ausente. Configure no Render para evitar fluxo inseguro com chave pública."
    );
  }

  const updateExistingAuthUser = async (userId) => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    });
    const payload = await safeJson(response);
    if (!response.ok) {
      const message = String(
        payload?.msg ||
          payload?.message ||
          payload?.error_description ||
          payload?.error ||
          "Erro ao atualizar usuário auth",
      );
      throw new Error(message);
    }
    return { userId, created: false };
  };

  // First, try to reuse existing auth user by email.
  const existingId = await findAuthUserIdByEmail(email);
  if (existingId) {
    console.log('[createSupabaseAuthUser] Found existing user by email:', existingId);
    return updateExistingAuthUser(existingId);
  }

  console.log('[createSupabaseAuthUser] Creating new user via admin API...');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  });

  const payload = await safeJson(response);
  console.log('[createSupabaseAuthUser] Admin API response:', response.status, payload);

  if (response.ok && (payload?.user?.id || payload?.id)) {
    const newUserId = payload?.user?.id || payload?.id;
    console.log('[createSupabaseAuthUser] Admin user creation success:', newUserId);
    return { userId: newUserId, created: true };
  }

  let message = String(
    payload?.msg ||
      payload?.message ||
      payload?.error ||
      "Erro ao criar usuário auth",
  );
  if (payload?.raw_text) {
    message += ` | RAW: ${payload.raw_text.substring(0, 100)}`;
  }
  console.log('[createSupabaseAuthUser] Error message:', message);
  if (/already|registered|exists|duplicat/i.test(message)) {
    const duplicateId = await findAuthUserIdByEmail(email);
    if (duplicateId) {
      return updateExistingAuthUser(duplicateId);
    }
  }

  if (message.includes("invalid JWT") || message.includes("unable to parse or verify signature")) {
    message = "Estado não suportado ou dados não puderam ser autenticados. A chave SUPABASE_SERVICE_ROLE_KEY no Render está com assinatura inválida. Vá em 'Project Settings -> API -> Legacy anon, service_role API keys' no Supabase e copie a chave ATUAL (começa com eyJhb...). Não use chaves antigas se o JWT secret foi alterado.";
  }

  throw new Error(message);
};

const upsertClinicRecord = async ({
  clinicId,
  clinicName,
  docType,
  docNumber,
  modality,
  plan,
  phone,
  email,
}) => {
  console.log('[upsertClinicRecord] Starting for clinicId:', clinicId);

  const payload = {
    id: clinicId,
    name: clinicName,
    cnpj: String(docNumber || "").replace(/\D/g, "") || null,
    plan: sanitizePlan(plan),
    status: "active",
    phone,
    email,
    created_at: new Date().toISOString(),
  };

  // Use supabaseAdmin JS client (bypasses REST API permission issues)
  const { data: existingClinic } = await supabaseAdmin
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .maybeSingle();

  if (existingClinic) {
    console.log('[upsertClinicRecord] Clinic exists, updating...');
    const { error } = await supabaseAdmin
      .from("clinics")
      .update(payload)
      .eq("id", clinicId);
    if (error) {
      console.error('[upsertClinicRecord] UPDATE failed:', error);
      if (error.message?.includes('clinics_cnpj_key') || error.code === '23505') {
        throw new Error("Este CPF/CNPJ já está cadastrado em outra clínica.");
      }
      throw new Error(error.message || "Erro ao atualizar clínica");
    }
    return { created: false };
  }

  console.log('[upsertClinicRecord] Creating new clinic...');
  const { error } = await supabaseAdmin
    .from("clinics")
    .insert(payload);
  if (error) {
    console.error('[upsertClinicRecord] INSERT failed:', error);
    if (error.message?.includes('clinics_cnpj_key') || error.code === '23505') {
      throw new Error("Este CPF/CNPJ já está cadastrado em outra clínica.");
    }
    throw new Error(error.message || "Erro ao criar clínica");
  }
  console.log('[upsertClinicRecord] Clinic created successfully');
  return { created: true };
};

const upsertClinicAdminUser = async ({
  userId,
  clinicId,
  name,
  email,
  phone,
}) => {
  console.log('[upsertClinicAdminUser] Starting for userId:', userId, 'clinicId:', clinicId);

  const existing = await fetchUserByEmail(email);
  const payload = {
    id: userId,
    clinic_id: clinicId,
    name,
    email,
    phone,
    role: "admin",
    active: true,
    created_at: new Date().toISOString(),
  };

  if (existing) {
    if (existing.clinic_id && existing.clinic_id !== clinicId) {
      throw new Error("Este email já está vinculado a outra clínica.");
    }
    console.log('[upsertClinicAdminUser] User exists, updating...');
    const { error } = await supabaseAdmin
      .from("users")
      .update({ ...payload, id: existing.id })
      .eq("id", existing.id);
    if (error) {
      console.error('[upsertClinicAdminUser] UPDATE failed:', error);
      throw new Error(error.message || "Erro ao atualizar usuário administrador");
    }
    return { created: false, userId: existing.id };
  }

  console.log('[upsertClinicAdminUser] Creating new admin user...');
  const { error } = await supabaseAdmin
    .from("users")
    .insert(payload);
  if (error) {
    console.error('[upsertClinicAdminUser] INSERT failed:', error);
    throw new Error(error.message || "Erro ao criar usuário administrador");
  }
  console.log('[upsertClinicAdminUser] Admin user created successfully');
  return { created: true, userId };
};

const upsertClinicTeamUser = async ({
  userId,
  clinicId,
  name,
  email,
  phone,
  role,
  commissionPct,
  token,
}) => {
  const normalizedRole = String(role || "receptionist").trim() || "receptionist";
  const normalizedCommission = Number.isFinite(Number(commissionPct))
    ? Number(commissionPct)
    : 0;
  const existingByEmail = await fetchUserByEmail(email);

  if (existingByEmail?.clinic_id && existingByEmail.clinic_id !== clinicId) {
    throw new Error("Este email já está vinculado a outra clínica.");
  }

  const payload = {
    id: userId,
    clinic_id: clinicId,
    name,
    email,
    phone,
    role: normalizedRole,
    commission: normalizedCommission,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingByEmail?.id) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${existingByEmail.id}`,
      {
        method: "PATCH",
        headers: getSupabaseWriteHeaders(token),
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const err = await safeJson(response);
      console.error("[upsertClinicTeamUser] Failed to patch user. Response status:", response.status, "Payload:", err);
      throw new Error(err?.message || err?.error || err?.raw_text || "Erro ao atualizar usuário da equipe");
    }
    return { created: false, userId: existingByEmail.id };
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: getSupabaseWriteHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text();
    let err;
    try {
      err = JSON.parse(errText);
    } catch(e) {
      err = { raw_text: errText };
    }
    console.error("[upsertClinicTeamUser] Failed to insert user. Response status:", response.status, "Payload:", errText);
    throw new Error(err?.message || err?.error || err?.raw_text || "Erro ao criar usuário da equipe");
  }

  return { created: true, userId };
};
const assertPhoneVerificationValid = async ({ signupId, phone }) => {
  const session = await getVerificationSession(signupId);
  if (!session) {
    throw new Error(
      "Validação de telefone não encontrada. Solicite um novo código.",
    );
  }

  const normalizedPhone = normalizePhoneForSignup(phone);
  if (!normalizedPhone || session.phone !== normalizedPhone) {
    throw new Error("Telefone informado não corresponde ao telefone validado.");
  }

  if (!session.verifiedAt) {
    throw new Error("Telefone ainda não validado.");
  }

  if (Date.now() - session.verifiedAt > SIGNUP_VERIFIED_TTL_MS) {
    throw new Error("Validação de telefone expirada. Solicite novo código.");
  }
};

const consumePhoneVerification = async (signupId) => {
  const session = await getVerificationSession(signupId);
  if (!session) return;
  session.consumedAt = Date.now();
  await setVerificationSession(signupId, session);
};


export {
  fetchUserByEmail,
  fetchClinicById,
  findAuthUserIdByEmail,
  createSupabaseAuthUser,
  upsertClinicRecord,
  upsertClinicAdminUser,
  upsertClinicTeamUser,
  assertPhoneVerificationValid,
  consumePhoneVerification
};
