import express from "express";
import crypto from "crypto";

const ADMIN_ROLES = new Set(["admin", "owner", "super_admin"]);

export const createCampaignRoutes = ({ campaignsByClinic, supabaseAdmin }) => {
  const router = express.Router();

  const resolveAuthorizedClinicId = (req, requestedClinicId = "") => {
    const actorRole = String(req.user?.role || "").toLowerCase();
    const actorClinicId = String(req.user?.clinic_id || req.clinicId || "").trim();
    const targetClinicId = String(requestedClinicId || "").trim();
    if (!actorClinicId && actorRole !== "super_admin") return { ok: false, status: 401, error: "Contexto de clínica ausente na sessão." };
    if (actorRole === "super_admin") {
      if (!targetClinicId) return { ok: false, status: 400, error: "clinicId é obrigatório para super_admin." };
      return { ok: true, clinicId: targetClinicId };
    }
    if (targetClinicId && targetClinicId !== actorClinicId) return { ok: false, status: 403, error: "Acesso negado para outra clínica." };
    return { ok: true, clinicId: actorClinicId };
  };

  const requireCampaignAdmin = (req, res) => {
    if (!ADMIN_ROLES.has(String(req.user?.role || "").toLowerCase())) {
      res.status(403).json({ ok: false, error: "Apenas administradores podem gerenciar campanhas." });
      return false;
    }
    return true;
  };

  const normalize = (campaign) => ({
    ...campaign,
    clinicId: campaign.clinicId || campaign.clinic_id,
    clinic_id: campaign.clinic_id || campaign.clinicId,
    created_at: campaign.created_at || campaign.createdAt || new Date().toISOString(),
  });

  const readFromDatabase = async (clinicId) => {
    if (!supabaseAdmin) return campaignsByClinic.get(clinicId) || [];
    const { data, error } = await supabaseAdmin.from("marketing_campaigns").select("payload").eq("clinic_id", clinicId).order("created_at", { ascending: false });
    if (error) throw error;
    const campaigns = (data || []).map((row) => normalize(row.payload));
    campaignsByClinic.set(clinicId, campaigns);
    return campaigns;
  };

  const writeToDatabase = async (campaign) => {
    if (!supabaseAdmin) return;
    const normalized = normalize(campaign);
    const { error } = await supabaseAdmin.from("marketing_campaigns").upsert({
      id: normalized.id,
      clinic_id: normalized.clinic_id,
      status: normalized.status,
      payload: normalized,
      created_at: normalized.created_at,
      updated_at: normalized.updated_at || new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) throw error;
  };

  const deleteFromDatabase = async (clinicId, id) => {
    if (!supabaseAdmin) return;
    const { error } = await supabaseAdmin.from("marketing_campaigns").delete().eq("clinic_id", clinicId).eq("id", id);
    if (error) throw error;
  };

  const findCampaign = async (clinicId, id) => {
    const campaigns = await readFromDatabase(clinicId);
    return { campaigns, index: campaigns.findIndex((campaign) => campaign.id === id) };
  };

  const hydrate = async () => {
    if (!supabaseAdmin) return;
    const { data, error } = await supabaseAdmin.from("marketing_campaigns").select("clinic_id, payload");
    if (error) {
      console.error("[Campaigns] Falha ao hidratar campanhas persistidas:", error.message);
      return;
    }
    for (const row of data || []) {
      const current = campaignsByClinic.get(row.clinic_id) || [];
      campaignsByClinic.set(row.clinic_id, [...current.filter((item) => item.id !== row.payload?.id), normalize(row.payload)]);
    }
  };
  void hydrate();

  router.get("/clinic/:clinicId", async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    try {
      return res.json({ ok: true, campaigns: await readFromDatabase(auth.clinicId) });
    } catch (error) {
      console.error("[Campaigns] Falha ao carregar campanhas:", error.message);
      return res.status(503).json({ ok: false, error: "Campanhas indisponíveis no momento." });
    }
  });

  router.post("/create", async (req, res) => {
    if (!requireCampaignAdmin(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const config = req.body?.config || {};
    const name = String(req.body?.name || config.name || "").trim();
    const message = String(req.body?.message || config.message || "").trim();
    if (!name || !message) return res.status(400).json({ ok: false, error: "clinicId, name e message são obrigatórios." });

    const timestamp = new Date().toISOString();
    const contacts = Array.isArray(config.contacts) ? config.contacts.slice(0, 500) : [];
    const campaign = normalize({
      id: `campaign-${crypto.randomUUID()}`,
      clinicId: auth.clinicId,
      clinic_id: auth.clinicId,
      name: name.slice(0, 120),
      message: message.slice(0, 4000),
      channel: config.channel || "whatsapp",
      target: config.target || "all",
      subject: String(config.subject || "").slice(0, 200),
      template: String(config.template || "").slice(0, 10000),
      contacts,
      settings: config.settings || {},
      status: "draft",
      progress: 0,
      createdAt: timestamp,
      created_at: timestamp,
      stats: { totalContacts: contacts.length, sent: 0, delivered: 0, failed: 0, pending: contacts.length, skipped: 0 },
    });
    try {
      const current = await readFromDatabase(auth.clinicId);
      campaignsByClinic.set(auth.clinicId, [...current, campaign]);
      await writeToDatabase(campaign);
      return res.status(201).json({ ok: true, campaign });
    } catch (error) {
      console.error("[Campaigns] Falha ao persistir campanha:", error.message);
      return res.status(503).json({ ok: false, error: "Não foi possível salvar a campanha." });
    }
  });

  router.put("/:id", async (req, res) => {
    if (!requireCampaignAdmin(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body?.clinicId || req.query?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    try {
      const { campaigns, index } = await findCampaign(auth.clinicId, req.params.id);
      if (index === -1) return res.status(404).json({ ok: false, error: "Campanha não encontrada" });
      const editable = ["name", "message", "subject", "template", "target", "channel"];
      const sanitized = Object.fromEntries(editable.filter((key) => req.body?.[key] !== undefined).map((key) => [key, req.body[key]]));
      const campaign = normalize({ ...campaigns[index], ...sanitized, updated_at: new Date().toISOString() });
      campaigns[index] = campaign;
      campaignsByClinic.set(auth.clinicId, campaigns);
      await writeToDatabase(campaign);
      return res.json({ ok: true, campaign });
    } catch (error) {
      console.error("[Campaigns] Falha ao atualizar campanha:", error.message);
      return res.status(503).json({ ok: false, error: "Não foi possível atualizar a campanha." });
    }
  });

  router.delete("/:id", async (req, res) => {
    if (!requireCampaignAdmin(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.query?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    try {
      const { campaigns, index } = await findCampaign(auth.clinicId, req.params.id);
      if (index === -1) return res.status(404).json({ ok: false, error: "Campanha não encontrada" });
      campaigns.splice(index, 1);
      campaignsByClinic.set(auth.clinicId, campaigns);
      await deleteFromDatabase(auth.clinicId, req.params.id);
      return res.json({ ok: true });
    } catch (error) {
      console.error("[Campaigns] Falha ao excluir campanha:", error.message);
      return res.status(503).json({ ok: false, error: "Não foi possível excluir a campanha." });
    }
  });

  router.post("/:id/:action", async (req, res) => {
    if (!requireCampaignAdmin(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body?.clinicId || req.query?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    try {
      const { campaigns, index } = await findCampaign(auth.clinicId, req.params.id);
      if (index === -1) return res.status(404).json({ ok: false, error: "Campanha não encontrada" });
      const campaign = campaigns[index];
      if (["start", "resume"].includes(req.params.action)) {
        campaign.status = "running";
        campaign.startedAt ||= new Date().toISOString();
      } else if (req.params.action === "pause") {
        campaign.status = "paused";
      } else if (["finish", "completed", "stop"].includes(req.params.action)) {
        campaign.status = "completed";
        campaign.completedAt = new Date().toISOString();
      } else {
        return res.status(400).json({ ok: false, error: "Ação de campanha inválida." });
      }
      campaign.updated_at = new Date().toISOString();
      campaigns[index] = campaign;
      campaignsByClinic.set(auth.clinicId, campaigns);
      await writeToDatabase(campaign);
      return res.json({ ok: true, campaign });
    } catch (error) {
      console.error("[Campaigns] Falha ao alterar estado da campanha:", error.message);
      return res.status(503).json({ ok: false, error: "Não foi possível alterar a campanha." });
    }
  });

  return router;
};
