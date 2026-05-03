import express from "express";
import crypto from "crypto";

export const createCampaignRoutes = ({ campaignsByClinic }) => {
  const router = express.Router();

  router.get("/clinic/:clinicId", (req, res) => {
    const clinicId = String(req.params?.clinicId || "").trim();
    const campaigns = campaignsByClinic.get(clinicId) || [];
    res.json({ ok: true, campaigns });
  });

  router.post("/create", (req, res) => {
    const clinicId = String(req.body?.clinicId || "").trim();
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
    
    for (const [clinicId, campaigns] of campaignsByClinic.entries()) {
      const index = campaigns.findIndex(c => c.id === id);
      if (index !== -1) {
        campaigns[index] = { ...campaigns[index], ...updates, updated_at: new Date().toISOString() };
        campaignsByClinic.set(clinicId, campaigns);
        return res.json({ ok: true, campaign: campaigns[index] });
      }
    }
    return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
  });

  router.delete("/:id", (req, res) => {
    const { id } = req.params;
    for (const [clinicId, campaigns] of campaignsByClinic.entries()) {
      const index = campaigns.findIndex(c => c.id === id);
      if (index !== -1) {
        campaigns.splice(index, 1);
        campaignsByClinic.set(clinicId, campaigns);
        return res.json({ ok: true });
      }
    }
    return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
  });

  router.post("/:id/:action", (req, res) => {
    const { id, action } = req.params;
    
    for (const [clinicId, campaigns] of campaignsByClinic.entries()) {
      const index = campaigns.findIndex(c => c.id === id);
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
        campaignsByClinic.set(clinicId, campaigns);
        return res.json({ ok: true, campaign });
      }
    }
    return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
  });

  return router;
};
