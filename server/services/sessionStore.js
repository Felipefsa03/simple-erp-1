export const phoneVerificationSessions = new Map();
export const passwordResetSessions = new Map();
export const signupSessions = new Map();

// --- Phone Verification ---
export const getVerificationSession = (id) => phoneVerificationSessions.get(String(id));
export const setVerificationSession = (id, session) => phoneVerificationSessions.set(String(id), session);
export const deleteVerificationSession = (id) => phoneVerificationSessions.delete(String(id));

// --- Password Reset ---
export const getPasswordResetSession = (email) => passwordResetSessions.get(String(email).toLowerCase());
export const setPasswordResetSession = (email, session) => passwordResetSessions.set(String(email).toLowerCase(), session);
export const deletePasswordResetSession = (email) => passwordResetSessions.delete(String(email).toLowerCase());

// --- General Signup ---
export const getSignupSession = (id) => signupSessions.get(String(id));
export const setSignupSession = (id, session) => signupSessions.set(String(id), session);
export const deleteSignupSession = (id) => signupSessions.delete(String(id));

// --- Expiration Sweeper ---
const SIGNUP_VERIFIED_TTL_MS = 30 * 60 * 1000;

export const clearExpiredVerificationSessions = () => {
  const now = Date.now();
  for (const [key, session] of phoneVerificationSessions.entries()) {
    const verificationExpired =
      !session.verifiedAt || now - session.verifiedAt > SIGNUP_VERIFIED_TTL_MS;
    const codeExpired = !session.expiresAt || now > session.expiresAt;
    const blockExpired = !session.blockedUntil || now > session.blockedUntil;
    const shouldDelete = verificationExpired && codeExpired && blockExpired;
    if (shouldDelete) {
      phoneVerificationSessions.delete(key);
    }
  }
};
