import { supabaseAdmin } from "./supabase.js";

const TTL_MS = 30 * 60 * 1000; // 30 minutes

const getSessionFromDb = async (identifier, sessionType) => {
  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .select('*')
    .eq('identifier', String(identifier))
    .eq('session_type', sessionType)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  
  // Compatibilidade com o formato anterior
  return {
    ...data.extra_data,
    codeHash: data.code_hash, // camelCase
    code: data.code_hash, // fallback
    attempts: data.attempts,
    verifiedAt: data.verified ? new Date().getTime() : null,
    expiresAt: new Date(data.expires_at).getTime(),
    blockedUntil: data.extra_data.blockedUntil || null
  };
};

const saveSessionToDb = async (identifier, sessionType, session) => {
  const code_hash = session.code || session.codeHash || 'legacy';
  const expires_at = new Date(session.expiresAt || Date.now() + TTL_MS).toISOString();
  
  // Limpa o código do JSONB para não duplicar e expor
  const extra_data = { ...session };
  delete extra_data.code;
  delete extra_data.codeHash;
  
  // Como não há unique constraint em (identifier, session_type), deletamos e inserimos
  await deleteSessionFromDb(identifier, sessionType);

  const { error } = await supabaseAdmin
    .from('auth_sessions')
    .insert({
      session_type: sessionType,
      identifier: String(identifier),
      code_hash,
      attempts: session.attempts || 0,
      expires_at,
      verified: !!session.verifiedAt,
      extra_data
    });
    
  if (error) {
    console.error(`[SessionStore] Failed to save ${sessionType} for ${identifier}:`, error.message);
  }
};

const deleteSessionFromDb = async (identifier, sessionType) => {
  await supabaseAdmin
    .from('auth_sessions')
    .delete()
    .eq('identifier', String(identifier))
    .eq('session_type', sessionType);
};

// --- Phone Verification ---
export const getVerificationSession = async (id) => getSessionFromDb(id, 'signup'); // A migração sugere 'signup' para verificação de telefone
export const setVerificationSession = async (id, session) => saveSessionToDb(id, 'signup', session);
export const deleteVerificationSession = async (id) => deleteSessionFromDb(id, 'signup');

// --- Password Reset ---
export const getPasswordResetSession = async (email) => getSessionFromDb(email.toLowerCase(), 'reset');
export const setPasswordResetSession = async (email, session) => saveSessionToDb(email.toLowerCase(), 'reset', session);
export const deletePasswordResetSession = async (email) => deleteSessionFromDb(email.toLowerCase(), 'reset');

// --- General Signup --- (Mesmo que Phone Verification para evitar confusão)
export const getSignupSession = async (id) => getSessionFromDb(id, 'signup');
export const setSignupSession = async (id, session) => saveSessionToDb(id, 'signup', session);
export const deleteSignupSession = async (id) => deleteSessionFromDb(id, 'signup');

// --- Expiration Sweeper ---
export const clearExpiredVerificationSessions = async () => {
  await supabaseAdmin
    .from('auth_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());
};
