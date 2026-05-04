import express from "express";
import crypto from "crypto";

export const createCampaignRoutes = ({ campaignsByClinic }) => {
  const router = express.Router();
  const resolveAuthorizedClinicId = (req, requestedClinicId = "") => {
    const actorRole = String(req.user?.role || "").toLowerCase();
    const actorClinicId = String(req.user?.clinic_id || req.clinicId || "").trim();
    const targetClinicId = String(requestedClinicId || "").trim();

    if (!actorClinicId && actorRole !== "super_admin") {
      return { ok: false, status: 401, error: "Contexto de clínica ausente na sessão." };
    }
    if (actorRole === "super_admin") {
      if (!targetClinicId) return { ok: false, status: 400, error: "clinicId é obrigatório para super_admin." };
      return { ok: true, clinicId: targetClinicId, isSuperAdmin: true };
    }
    if (targetClinicId && targetClinicId !== actorClinicId) {
      return { ok: false, status: 403, error: "Acesso negado para outra clínica." };
    }
    return { ok: true, clinicId: actorClinicId, isSuperAdmin: false };
  };

  const findCampaignByIdInClinic = (clinicId, id) => {
    const campaigns = campaignsByClinic.get(clinicId) || [];
    const index = campaigns.findIndex((c) => c.id === id);
    return { campaigns, index };
  };

  router.get("/clinic/:clinicId", (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;
    const campaigns = campaignsByClinic.get(clinicId) || [];
    res.json({ ok: true, campaigns });
  });

  router.post("/create", (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.body?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;
    const config = req.body?.config || {};
    const name = String(req.body?.name || config.name || "").trim();
    const message = String(req.body?.message || config.message || "").trim();

    if (!clinicId || !name || !message) {
      return res.status(400).json({
        ok: false,
        error: "clinicId, name e message sao obrigatorios.",
      });
    }

    const campaign = {
      id: `campaign-${crypto.randomUUID()}`,
      clinicId,
      clinic_id: clinicId,
      name,
      message,
      channel: config.channel || 'whatsapp',
      target: config.target || 'all',
      subject: config.subject || '',
      template: config.template || '',
      contacts: Array.isArray(config.contacts) ? config.contacts : [],
      status: "draft",
      progress: 0,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      stats: {
        totalContacts: Array.isArray(config.contacts) ? config.contacts.length : 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        skipped: 0
      }
    };

    const current = campaignsByClinic.get(clinicId) || [];
    campaignsByClinic.set(clinicId, [...current, campaign]);
    return res.status(201).json({ ok: true, campaign });
  });

  router.put("/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const auth = resolveAuthorizedClinicId(req, updates?.clinicId || req.query?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const { campaigns, index } = findCampaignByIdInClinic(auth.clinicId, id);
    if (index !== -1) {
      campaigns[index] = { ...campaigns[index], ...updates, clinicId: auth.clinicId, clinic_id: auth.clinicId, updated_at: new Date().toISOString() };
      campaignsByClinic.set(auth.clinicId, campaigns);
      return res.json({ ok: true, campaign: campaigns[index] });
    }
    return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
  });

  router.delete("/:id", (req, res) => {
    const { id } = req.params;
    const auth = resolveAuthorizedClinicId(req, req.query?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const { campaigns, index } = findCampaignByIdInClinic(auth.clinicId, id);
    if (index !== -1) {
      campaigns.splice(index, 1);
      campaignsByClinic.set(auth.clinicId, campaigns);
      return res.json({ ok: true });
    }
    return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
  });

  router.post("/:id/:action", (req, res) => {
    const { id, action } = req.params;
    const auth = resolveAuthorizedClinicId(req, req.body?.clinicId || req.query?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const { campaigns, index } = findCampaignByIdInClinic(auth.clinicId, id);
    if (index !== -1) {
      const campaign = campaigns[index];

      if (action === 'start' || action === 'resume') {
        campaign.status = 'running';
        if (!campaign.startedAt) campaign.startedAt = new Date().toISOString();
      } else if (action === 'pause') {
        campaign.status = 'paused';
      } else if (action === 'finish' || action === 'completed') {
        campaign.status = 'completed';
        campaign.completedAt = new Date().toISOString();
      }

      campaigns[index] = campaign;
      campaignsByClinic.set(auth.clinicId, campaigns);
      return res.json({ ok: true, campaign });
    }
    return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
  });

  return router;
};
