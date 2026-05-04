import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

// In-memory cache for banned IPs to reduce DB calls on every request
const bannedIPsCache = new Map();

// Helper to check if an IP is banned
export const checkBannedIP = async (req, res, next, supabaseAdmin) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  if (!ip) return next();

  // Check memory cache first
  const cachedBan = bannedIPsCache.get(ip);
  if (cachedBan) {
    if (Date.now() < cachedBan.expiresAt) {
      return res.status(403).json({ error: "Access Denied: Your IP has been temporarily banned due to suspicious activity." });
    } else {
      bannedIPsCache.delete(ip); // Expired
    }
  }

  try {
    // Check DB
    const { data, error } = await supabaseAdmin
      .from('banned_ips')
      .select('expires_at')
      .eq('ip_address', ip)
      .single();

    if (data && new Date(data.expires_at).getTime() > Date.now()) {
      bannedIPsCache.set(ip, { expiresAt: new Date(data.expires_at).getTime() });
      return res.status(403).json({ error: "Access Denied: Your IP has been temporarily banned due to suspicious activity." });
    } else if (data) {
      // Ban expired in DB, remove it
      await supabaseAdmin.from('banned_ips').delete().eq('ip_address', ip);
    }
  } catch (err) {
    console.error("[FIREWALL] Error checking banned IP:", err.message);
  }

  next();
};

export const banIp = async (ip, reason, durationMinutes, supabaseAdmin, sendAlert) => {
  if (!ip) return;
  const expiresAt = new Date(Date.now() + durationMinutes * 60000);
  
  bannedIPsCache.set(ip, { expiresAt: expiresAt.getTime() });

  try {
    await supabaseAdmin.from('banned_ips').upsert({
      ip_address: ip,
      reason,
      expires_at: expiresAt.toISOString(),
      banned_by_system: true
    });

    await supabaseAdmin.from('security_logs').insert({
      ip_address: ip,
      event_type: 'BANNED_IP',
      severity: 'high',
      action_taken: 'BANNED_IP',
      payload: { reason, durationMinutes }
    });

    if (sendAlert) {
      sendAlert(`🛡️ *DEFESA CLINXIA ATIVADA* 🛡️\nUm ataque foi neutralizado automaticamente.\n*Ameaça:* ${reason}\n*IP Atacante:* ${ip}\n*Ação:* IP Banido por ${durationMinutes} minutos.`);
    }

  } catch (err) {
    console.error("[FIREWALL] Failed to ban IP in DB:", err.message);
  }
};

// Create a rate limiter that bans the IP if exceeded
export const createStrictLimiter = (supabaseAdmin, sendAlert) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Aumentado para evitar banimentos falsos em uso normal (polling, etc)
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res, next, options) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      console.warn(`[FIREWALL] Strict rate limit exceeded for IP: ${ip}`);
      
      // Ban the IP for 60 minutes
      await banIp(ip, "Rate limit exceeded (Possible DDoS or Brute Force)", 60, supabaseAdmin, sendAlert);
      
      res.status(429).json({ error: "Too many requests, IP temporarily banned." });
    }
  });
};

// Slow down to frustrate brute force attacks
export const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per 15 minutes without delay
  delayMs: (hits) => hits * 1000, // Add 1s delay per request above 5 (e.g., 6th req = 6s delay)
});
