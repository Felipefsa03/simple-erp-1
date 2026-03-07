import express from 'express';
import dotenv from 'dotenv';
import {
  createCustomer,
  createPayment,
  createSubscription,
  getPayment,
  resolveAsaasConfig,
  testConnection,
} from './asaasClient.mjs';
import { loadStore, mutateStore } from './store.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const app = express();
const port = Number(process.env.API_PORT || 8787);

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'Content-Type, Authorization, asaas-access-token');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'luminaflow-api', timestamp: new Date().toISOString() });
});

app.post('/api/asaas/test', async (req, res) => {
  const { apiKey, environment } = req.body || {};
  const result = await testConnection({ apiKey, environment });
  if (!result.ok) {
    res.status(result.status || 500).json({ ok: false, message: result.error, details: result.data });
    return;
  }
  res.json({
    ok: true,
    environment,
    account: result.data,
  });
});

app.post('/api/asaas/charge', async (req, res) => {
  const { patient, transaction, config } = req.body || {};
  if (!patient?.name || !patient?.phone) {
    res.status(400).json({ ok: false, message: 'Paciente invalido para cobranca.' });
    return;
  }
  if (!transaction?.amount || !transaction?.method) {
    res.status(400).json({ ok: false, message: 'Transacao invalida para cobranca.' });
    return;
  }

  const asaasConfig = resolveAsaasConfig(config);
  const customerResult = await createCustomer(
    {
      name: patient.name,
      cpfCnpj: patient.cpf,
      email: patient.email,
      mobilePhone: patient.phone,
      externalReference: patient.id || transaction.patient_id,
    },
    asaasConfig
  );

  if (!customerResult.ok) {
    res.status(customerResult.status || 500).json({
      ok: false,
      stage: 'customer',
      message: customerResult.error,
      details: customerResult.data,
    });
    return;
  }

  const billingTypeMap = {
    pix: 'PIX',
    card: 'CREDIT_CARD',
    boleto: 'BOLETO',
    manual: 'UNDEFINED',
  };

  const dueDate = transaction.due_date || new Date().toISOString().split('T')[0];
  const paymentResult = await createPayment(
    {
      customer: customerResult.data.id,
      billingType: billingTypeMap[transaction.method] || 'UNDEFINED',
      dueDate,
      value: Number(transaction.amount),
      description: transaction.description || 'Cobranca LuminaFlow',
      externalReference: transaction.idempotency_key || transaction.id,
      installmentCount: transaction.installments && transaction.installments > 1 ? transaction.installments : undefined,
      totalValue: transaction.installments && transaction.installments > 1 ? Number(transaction.amount) * transaction.installments : undefined,
    },
    asaasConfig
  );

  if (!paymentResult.ok) {
    res.status(paymentResult.status || 500).json({
      ok: false,
      stage: 'payment',
      message: paymentResult.error,
      details: paymentResult.data,
    });
    return;
  }

  const created = paymentResult.data;
  mutateStore((store) => {
    store.payments[created.id] = {
      id: created.id,
      asaasStatus: created.status,
      transactionId: transaction.id,
      appointmentId: transaction.appointment_id,
      value: created.value,
      createdAt: new Date().toISOString(),
      patientName: patient.name,
      externalReference: created.externalReference,
      raw: created,
    };
    return store;
  });

  res.json({
    ok: true,
    payment: {
      id: created.id,
      status: created.status,
      invoiceUrl: created.invoiceUrl,
      bankSlipUrl: created.bankSlipUrl,
      pixQrCode: created.pixQrCode,
      pixCopyPaste: created.pixCopyAndPaste,
      externalReference: created.externalReference,
    },
  });
});

app.post('/api/asaas/subscription', async (req, res) => {
  const { customerId, value, billingType = 'PIX', nextDueDate, cycle = 'MONTHLY', description, externalReference, config } = req.body || {};
  if (!customerId || !value || !nextDueDate) {
    res.status(400).json({ ok: false, message: 'Dados insuficientes para recorrencia.' });
    return;
  }
  const result = await createSubscription(
    {
      customer: customerId,
      billingType,
      value: Number(value),
      nextDueDate,
      cycle,
      description,
      externalReference,
    },
    resolveAsaasConfig(config)
  );
  if (!result.ok) {
    res.status(result.status || 500).json({ ok: false, message: result.error, details: result.data });
    return;
  }
  mutateStore((store) => {
    store.subscriptions[result.data.id] = {
      ...result.data,
      createdAt: new Date().toISOString(),
    };
    return store;
  });
  res.json({ ok: true, subscription: result.data });
});

app.post('/api/asaas/reconcile', async (req, res) => {
  const { items, config } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    res.json({ ok: true, updates: [] });
    return;
  }

  const updates = [];
  for (const item of items) {
    if (!item?.payment_id) continue;
    const result = await getPayment(item.payment_id, resolveAsaasConfig(config));
    if (!result.ok || !result.data?.status) continue;

    const statusMap = {
      RECEIVED: 'paid',
      CONFIRMED: 'paid',
      OVERDUE: 'pending',
      PENDING: 'awaiting_payment',
      REFUNDED: 'refunded',
      RECEIVED_IN_CASH_UNDONE: 'cancelled',
      DELETED: 'cancelled',
      CANCELED: 'cancelled',
    };
    updates.push({
      payment_id: item.payment_id,
      transaction_id: item.transaction_id,
      asaas_status: result.data.status,
      next_status: statusMap[result.data.status] || 'pending',
      paid_at: result.data.paymentDate ? `${result.data.paymentDate}T00:00:00.000Z` : undefined,
      net_value: result.data.netValue,
    });
    mutateStore((store) => {
      store.payments[item.payment_id] = {
        ...(store.payments[item.payment_id] || {}),
        asaasStatus: result.data.status,
        lastReconciledAt: new Date().toISOString(),
        raw: result.data,
      };
      return store;
    });
  }
  res.json({ ok: true, updates });
});

app.post('/api/asaas/webhook', (req, res) => {
  const token = req.headers['asaas-access-token'];
  const expected = process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_API_KEY || process.env.ASAAS_API_KEY_SANDBOX;
  if (expected && token !== expected) {
    res.status(401).json({ ok: false, message: 'Token de webhook invalido.' });
    return;
  }
  const payload = req.body || {};
  mutateStore((store) => {
    store.webhooks.unshift({
      receivedAt: new Date().toISOString(),
      payload,
    });
    store.webhooks = store.webhooks.slice(0, 200);
    const paymentId = payload?.payment?.id;
    if (paymentId && store.payments[paymentId]) {
      store.payments[paymentId] = {
        ...store.payments[paymentId],
        asaasStatus: payload?.payment?.status || store.payments[paymentId].asaasStatus,
        lastWebhookAt: new Date().toISOString(),
        raw: payload?.payment || store.payments[paymentId].raw,
      };
    }
    return store;
  });
  res.json({ ok: true });
});

app.get('/api/asaas/payment/:id', (req, res) => {
  const store = loadStore();
  const found = store.payments[req.params.id];
  if (!found) {
    res.status(404).json({ ok: false, message: 'Pagamento nao encontrado localmente.' });
    return;
  }
  res.json({ ok: true, payment: found });
});

app.post('/api/notifications/send', async (req, res) => {
  const { channel, recipients, message, metadata } = req.body || {};
  if (!channel || !Array.isArray(recipients) || recipients.length === 0 || !message) {
    res.status(400).json({ ok: false, message: 'Payload invalido para notificacao.' });
    return;
  }

  const providerByChannel = {
    whatsapp: process.env.WHATSAPP_PROVIDER_URL,
    sms: process.env.SMS_PROVIDER_URL,
    email: process.env.EMAIL_PROVIDER_URL,
  };
  const targetUrl = providerByChannel[channel];

  let providerResponse = null;
  let delivered = false;

  if (targetUrl) {
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: process.env.NOTIFICATION_PROVIDER_TOKEN ? `Bearer ${process.env.NOTIFICATION_PROVIDER_TOKEN}` : '',
        },
        body: JSON.stringify({ recipients, message, metadata }),
      });
      providerResponse = await response.json().catch(() => null);
      delivered = response.ok;
    } catch (error) {
      providerResponse = { error: error instanceof Error ? error.message : 'erro_desconhecido' };
      delivered = false;
    }
  }

  mutateStore((store) => {
    store.notifications.unshift({
      sentAt: new Date().toISOString(),
      channel,
      recipients,
      message,
      delivered,
      providerResponse,
      metadata: metadata || null,
    });
    store.notifications = store.notifications.slice(0, 500);
    return store;
  });

  res.json({
    ok: true,
    delivered,
    mode: targetUrl ? 'provider' : 'queued',
    details: providerResponse,
  });
});

app.post('/api/integrations/memed/prescription', async (req, res) => {
  const { payload } = req.body || {};
  const targetUrl = process.env.MEMED_API_URL;
  if (!targetUrl) {
    mutateStore((store) => {
      store.integrations.memed.lastDraft = payload;
      store.integrations.memed.lastAt = new Date().toISOString();
      return store;
    });
    res.json({ ok: true, mode: 'local', message: 'Rascunho salvo. Configure MEMED_API_URL para envio real.' });
    return;
  }
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: process.env.MEMED_API_TOKEN ? `Bearer ${process.env.MEMED_API_TOKEN}` : '',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    res.status(response.ok ? 200 : response.status).json({ ok: response.ok, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'erro_memed' });
  }
});

app.post('/api/integrations/tiss/export', (req, res) => {
  const { claim } = req.body || {};
  if (!claim) {
    res.status(400).json({ ok: false, message: 'Guia TISS invalida.' });
    return;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tiss>
  <cabecalho>
    <versaoPadrao>4.01.00</versaoPadrao>
    <registroANS>${claim.registro_ans || ''}</registroANS>
    <numeroGuiaPrestador>${claim.numero_guia || ''}</numeroGuiaPrestador>
  </cabecalho>
  <beneficiario>
    <nome>${claim.patient_name || ''}</nome>
    <numeroCarteira>${claim.card_number || ''}</numeroCarteira>
  </beneficiario>
  <procedimento>
    <codigo>${claim.procedure_code || ''}</codigo>
    <descricao>${claim.procedure_name || ''}</descricao>
    <valor>${Number(claim.amount || 0).toFixed(2)}</valor>
  </procedimento>
</tiss>`;
  res.json({ ok: true, xml });
});

app.post('/api/integrations/rdstation/event', async (req, res) => {
  const { eventType, payload } = req.body || {};
  const token = process.env.RD_STATION_TOKEN;
  if (!token) {
    res.json({ ok: true, mode: 'local', message: 'RD_STATION_TOKEN nao configurado.', eventType, payload });
    return;
  }
  try {
    const response = await fetch('https://api.rd.services/platform/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        event_family: 'CDP',
        payload,
      }),
    });
    const data = await response.json().catch(() => null);
    res.status(response.ok ? 200 : response.status).json({ ok: response.ok, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'erro_rd_station' });
  }
});

app.post('/api/integrations/pixel/event', async (req, res) => {
  const { provider, payload } = req.body || {};
  const providerMap = {
    meta: {
      endpoint: process.env.META_PIXEL_ENDPOINT,
      token: process.env.META_PIXEL_TOKEN,
    },
    google: {
      endpoint: process.env.GOOGLE_ADS_ENDPOINT,
      token: process.env.GOOGLE_ADS_TOKEN,
    },
  };
  const current = providerMap[provider];
  if (!current?.endpoint) {
    res.json({ ok: true, mode: 'local', provider, payload });
    return;
  }
  try {
    const response = await fetch(current.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: current.token ? `Bearer ${current.token}` : '',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    res.status(response.ok ? 200 : response.status).json({ ok: response.ok, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'erro_ads_pixel' });
  }
});

app.listen(port, () => {
  console.log(`LuminaFlow API rodando em http://localhost:${port}`);
});
