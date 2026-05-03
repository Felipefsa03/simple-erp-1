import express from 'express';
import crypto from 'crypto';
import { requireAuth, require2FAPermission } from '../middleware/auth.js';
import { SUPABASE_URL, TOTP_ENCRYPTION_KEY } from '../config/env.js';
import { getServerHeaders } from '../services/supabase.js';
import { 
  getPasswordResetSession, 
  deletePasswordResetSession 
} from '../services/sessionStore.js';

const router = express.Router();

const hashPasswordResetCode = (email, code) =>
  crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");

// ============================================
// Password Reset Endpoints
// ============================================
router.post("/auth/password/reset-verify", async (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  
  if (!normalizedEmail || !code) {
    return res.status(400).json({ ok: false, error: "Email e código são obrigatórios" });
  }

  try {
    const session = await getPasswordResetSession(normalizedEmail);
    
    if (!session) {
      return res.status(400).json({ ok: false, error: "Nenhum código solicitado para este email." });
    }

    const now = Date.now();
    if (session.expiresAt && now > session.expiresAt) {
      await deletePasswordResetSession(normalizedEmail);
      return res.status(400).json({ ok: false, error: "Código expirado." });
    }

    const receivedHash = hashPasswordResetCode(normalizedEmail, code);
    if (receivedHash !== session.codeHash) {
      return res.status(400).json({ ok: false, error: "Código incorreto" });
    }

    return res.json({ ok: true, message: "Código validado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});


// ============================================
// 2FA Endpoints
// ============================================
router.post("/2fa/setup", requireAuth, require2FAPermission, async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    const userEmail = req.user?.email || "user@clinxia.com";
    const isSuperAdmin = req.user?.role === "super_admin";

    // Generate cryptographically secure secret (32 chars base32)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    const randomBytes = crypto.randomBytes(32);
    for (let i = 0; i < 32; i++) {
      secret += chars[randomBytes[i] % chars.length];
    }

    // Encrypt secret with server key
    if (!TOTP_ENCRYPTION_KEY) {
      return res.status(503).json({
        ok: false,
        error: "2FA indisponível: chave de criptografia não configurada.",
      });
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      crypto.scryptSync(TOTP_ENCRYPTION_KEY, "2fa-salt", 32),
      iv,
    );
    let encrypted = cipher.update(secret, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_2fa?on_conflict=user_id`,
      {
        method: "POST",
        headers: {
          ...getServerHeaders(),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          user_id: userId,
          secret_encrypted: JSON.stringify({
            encrypted,
            iv: iv.toString("hex"),
            authTag: authTag.toString("hex"),
          }),
          enabled: false,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (!upsertRes.ok) {
      const errorText = await upsertRes.text();
      console.error("[2FA Setup] Failed to upsert 2FA secret:", upsertRes.status, errorText);
      return res.status(500).json({ ok: false, error: "Erro ao salvar 2FA no banco de dados" });
    }

    // Generate QR code URI for authenticator app
    const appName = "Clinxia";
    const otpauthUri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;

    res.json({ ok: true, secret, otpauthUri, mandatory: isSuperAdmin });
  } catch (error) {
    console.error("[2FA Setup] Exception:", {
      message: error instanceof Error ? error.message : String(error),
      code: error.code || "UNKNOWN",
    });
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao configurar 2FA",
    });
  }
});

router.post("/2fa/verify", requireAuth, require2FAPermission, async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return res.status(400).json({ ok: false, error: "Código deve ter 6 dígitos" });
    }
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId é obrigatório" });
    }

    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}&select=*`,
      { headers: getServerHeaders() },
    );

    if (!supaRes.ok) {
      return res.status(500).json({ ok: false, error: "Erro ao verificar 2FA" });
    }

    const data = await supaRes.json();
    if (!data || data.length === 0) {
      return res.status(400).json({ ok: false, error: "2FA não configurado" });
    }

    const parsed = JSON.parse(data[0].secret_encrypted);
    if (!TOTP_ENCRYPTION_KEY) {
      return res.status(503).json({
        ok: false,
        error: "2FA indisponível: chave de criptografia não configurada.",
      });
    }
    
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      crypto.scryptSync(TOTP_ENCRYPTION_KEY, "2fa-salt", 32),
      Buffer.from(parsed.iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(parsed.authTag, "hex"));
    let decrypted = decipher.update(parsed.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    function base32Decode(base32) {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      let bits = "";
      for (const char of base32.toUpperCase()) {
        const val = alphabet.indexOf(char);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, "0");
      }
      const bytes = [];
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
      }
      return Buffer.from(bytes);
    }

    function generateTOTP(secret, time) {
      const key = base32Decode(secret);
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeBigInt64BE(BigInt(time));
      const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
      const offset = hmac[hmac.length - 1] & 0x0f;
      const code = (((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)) % 1000000;
      return String(code).padStart(6, "0");
    }

    const now = Math.floor(Date.now() / 1000 / 30);
    let isValid = false;
    for (let offset = -2; offset <= 2; offset++) {
      const expected = generateTOTP(decrypted, now + offset);
      if (expected === code) {
        isValid = true;
        break;
      }
    }

    if (isValid) {
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}`,
        {
          method: "PATCH",
          headers: getServerHeaders(),
          body: JSON.stringify({
            enabled: true,
            verified_at: new Date().toISOString(),
          }),
        },
      );

      if (!updateRes.ok) {
        return res.status(500).json({ ok: false, error: "Erro ao ativar 2FA" });
      }

      res.json({ ok: true });
    } else {
      res.status(400).json({ ok: false, error: "Código inválido" });
    }
  } catch (error) {
    console.error("[2FA Verify] Exception:", error.message);
    res.status(500).json({ ok: false, error: "Erro ao verificar 2FA" });
  }
});

router.post("/2fa/disable", requireAuth, require2FAPermission, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId é obrigatório" });
    }
    await fetch(`${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}`, {
      method: "DELETE",
      headers: getServerHeaders(),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Erro ao desativar 2FA" });
  }
});

router.get("/2fa/status", requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ ok: false, error: "userId é obrigatório" });
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}&select=*`, {
      headers: getServerHeaders(),
    });
    let enabled = false;
    if (supaRes.ok) {
      const data = await supaRes.json();
      enabled = data?.[0]?.enabled || false;
    }
    res.json({ ok: true, enabled });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Erro ao verificar status 2FA" });
  }
});

router.get("/2fa/test", async (req, res) => {
  try {
    const testRes = await fetch(`${SUPABASE_URL}/rest/v1/user_2fa?limit=1`, {
      headers: getServerHeaders(),
    });
    const data = await testRes.json();
    if (!testRes.ok) {
      return res.status(testRes.status).json({
        ok: false,
        error: data?.message || "Failed to access user_2fa table",
        status: testRes.status,
      });
    }
    res.json({
      ok: true,
      message: "Supabase connection OK",
      tableExists: true,
      recordCount: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Test failed" });
  }
});

export default router;
