// ============================================
// Document Templates - Professional Medical Documents
// ============================================

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface DocumentTemplate {
  id: string;
  type: 'certificate' | 'prescription' | 'consent' | 'contract' | 'custom';
  name: string;
  description: string;
}

export interface CertificateData {
  patientName: string;
  patientCpf: string;
  patientRg?: string;
  clinicName: string;
  clinicCnpj: string;
  clinicAddress: string;
  clinicPhone: string;
  professionalName: string;
  professionalCro?: string;
  professionalCpf?: string;
  diagnosis?: string;
  daysRest?: number;
  startDate: string;
  endDate?: string;
  observations?: string;
  city: string;
  state: string;
  date: string;
}

export interface PrescriptionData {
  patientName: string;
  patientCpf: string;
  clinicName: string;
  clinicCnpj: string;
  clinicAddress: string;
  clinicPhone: string;
  professionalName: string;
  professionalCro?: string;
  prescriptions: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  observations?: string;
  date: string;
}

export interface ConsentData {
  patientName: string;
  patientCpf: string;
  clinicName: string;
  clinicCnpj: string;
  clinicAddress: string;
  clinicPhone: string;
  professionalName: string;
  professionalCro?: string;
  procedure: string;
  risks?: string;
  benefits?: string;
  alternatives?: string;
  date: string;
  city?: string;
}

export const generateCertificateHTML = (data: CertificateData): string => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atestado Médico - ${escapeHtml(data.patientName)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
    }
    
    .document {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      border: 2px solid #1a1a1a;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1a1a1a;
    }
    
    .clinic-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .clinic-info {
      font-size: 12px;
      color: #444;
    }
    
    .document-title {
      font-size: 20px;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin: 30px 0;
      letter-spacing: 2px;
    }
    
    .content {
      text-align: justify;
      margin: 30px 0;
    }
    
    .content p {
      margin-bottom: 15px;
    }
    
    .patient-info {
      background: #f5f5f5;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    
    .patient-info strong {
      display: block;
      margin-bottom: 5px;
    }
    
    .diagnosis-box {
      background: #fffde7;
      padding: 15px;
      margin: 20px 0;
      border-left: 4px solid #ffc107;
    }
    
    .days-rest {
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 10px;
    }
    
    .days-number {
      font-size: 48px;
      font-weight: bold;
      color: #1a1a1a;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid #ddd;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
    }
    
    .signature-block {
      width: 45%;
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #1a1a1a;
      margin-top: 60px;
      padding-top: 10px;
    }
    
    .signature-name {
      font-weight: bold;
      font-size: 14px;
    }
    
    .signature-title {
      font-size: 12px;
      color: #666;
    }
    
    .cro-stamp {
      display: inline-block;
      border: 2px solid #1a1a1a;
      padding: 8px 16px;
      font-size: 12px;
      margin-top: 10px;
    }
    
    .watermark {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-size: 10px;
      color: #999;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .document {
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="clinic-name">${escapeHtml(data.clinicName)}</div>
      <div class="clinic-info">
        CNPJ: ${escapeHtml(data.clinicCnpj)}<br>
        ${escapeHtml(data.clinicAddress)}<br>
        Tel: ${escapeHtml(data.clinicPhone)}
      </div>
    </div>
    
    <div class="document-title">ATESTADO MÉDICO</div>
    
    <div class="content">
      <p>Atesto, para os devidos fins, que o(a) paciente <strong>${escapeHtml(data.patientName)}</strong>, portador(a) do CPF nº <strong>${escapeHtml(data.patientCpf)}</strong>${data.patientRg ? `, RG nº ${escapeHtml(data.patientRg)}` : ''}, foi atendido(a) nesta data em nosso estabelecimento.</p>
      
      ${data.diagnosis ? `
      <div class="diagnosis-box">
        <strong>Diagnóstico/CID:</strong><br>
        ${escapeHtml(data.diagnosis)}
      </div>
      ` : ''}
      
      ${data.daysRest ? `
      <div class="days-rest">
        <div class="days-number">${data.daysRest}</div>
        <div>${data.daysRest === 1 ? 'dia' : 'dias'} de afastamento</div>
        ${data.startDate ? `<div style="font-size: 14px; margin-top: 10px;">Período: ${formatDate(data.startDate)}${data.endDate ? ` a ${formatDate(data.endDate)}` : ''}</div>` : ''}
      </div>
      ` : ''}
      
      ${data.observations ? `
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>Observações:</strong><br>
        ${escapeHtml(data.observations)}
      </div>
      ` : ''}
      
      <p style="margin-top: 30px;">O presente atestado tem valor legal e é válido para todos os fins de direito.</p>
    </div>
    
    <div class="footer">
      <p style="text-align: right; margin-bottom: 20px;">
        ${data.city}, ${formatDateLong(data.date)}
      </p>
      
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line">
            <div class="signature-name">${escapeHtml(data.patientName)}</div>
            <div class="signature-title">Paciente</div>
          </div>
        </div>
        
        <div class="signature-block">
          <div class="signature-line">
            <div class="signature-name">${escapeHtml(data.professionalName)}</div>
            <div class="signature-title">Médico(a)/Profissional Responsável</div>
            ${data.professionalCro ? `<div class="cro-stamp">CRO/CRM: ${escapeHtml(data.professionalCro)}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    
    <div class="watermark">
      Documento gerado por Clinxia - Sistema de Gestão para Clínicas
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const generatePrescriptionHTML = (data: PrescriptionData): string => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receituário - ${escapeHtml(data.patientName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 30px;
    }
    .document { max-width: 700px; margin: 0 auto; padding: 30px; }
    .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #1a1a1a; }
    .clinic-name { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
    .clinic-info { font-size: 11px; color: #555; }
    .document-title { font-size: 18px; font-weight: bold; text-transform: uppercase; text-align: center; margin: 25px 0; letter-spacing: 2px; }
    .patient-box { background: #f8f8f8; padding: 12px; margin: 20px 0; border-radius: 5px; font-size: 13px; }
    .prescription-item { margin: 25px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .medication-name { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
    .prescription-detail { margin: 5px 0; font-size: 14px; }
    .prescription-detail strong { display: inline-block; width: 100px; }
    .obs-box { background: #fffde7; padding: 12px; margin: 20px 0; border-left: 3px solid #ffc107; font-size: 13px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature-block { width: 45%; text-align: center; }
    .signature-line { border-top: 1px solid #1a1a1a; margin-top: 50px; padding-top: 8px; }
    .signature-name { font-weight: bold; }
    .signature-title { font-size: 12px; color: #666; }
    .cro-stamp { display: inline-block; border: 1px solid #1a1a1a; padding: 5px 10px; font-size: 10px; margin-top: 8px; }
    .watermark { position: fixed; bottom: 15px; right: 15px; font-size: 9px; color: #aaa; }
    @media print { body { padding: 0; } .document { border: none; } }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="clinic-name">${escapeHtml(data.clinicName)}</div>
      <div class="clinic-info">CNPJ: ${escapeHtml(data.clinicCnpj)}<br>${escapeHtml(data.clinicAddress)}<br>Tel: ${escapeHtml(data.clinicPhone)}</div>
    </div>
    
    <div class="document-title">RECEITUÁRIO</div>
    
    <div class="patient-box">
      <strong>Paciente:</strong> ${escapeHtml(data.patientName)} &nbsp;|&nbsp; <strong>CPF:</strong> ${escapeHtml(data.patientCpf)}
    </div>
    
    ${data.prescriptions.map((rx, idx) => `
    <div class="prescription-item">
      <div class="medication-name">${idx + 1}. ${escapeHtml(rx.medication)}</div>
      <div class="prescription-detail"><strong>Dosagem:</strong> ${escapeHtml(rx.dosage)}</div>
      <div class="prescription-detail"><strong>Frequência:</strong> ${escapeHtml(rx.frequency)}</div>
      <div class="prescription-detail"><strong>Duração:</strong> ${escapeHtml(rx.duration)}</div>
      ${rx.instructions ? `<div class="prescription-detail"><strong>Observações:</strong> ${escapeHtml(rx.instructions)}</div>` : ''}
    </div>
    `).join('')}
    
    ${data.observations ? `
    <div class="obs-box"><strong>Observações:</strong> ${escapeHtml(data.observations)}</div>
    ` : ''}
    
    <div class="footer">
      <p style="text-align: right;">${data.date ? formatDate(data.date) : new Date().toLocaleDateString('pt-BR')}</p>
      
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line">
            <div class="signature-name">${escapeHtml(data.patientName)}</div>
            <div class="signature-title">Paciente ou Responsável</div>
          </div>
        </div>
        
        <div class="signature-block">
          <div class="signature-line">
            <div class="signature-name">${escapeHtml(data.professionalName)}</div>
            <div class="signature-title">Profissional Responsável</div>
            ${data.professionalCro ? `<div class="cro-stamp">CRO/CRM: ${escapeHtml(data.professionalCro)}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    
    <div class="watermark">Clinxia - Sistema de Gestão para Clínicas</div>
  </div>
</body>
</html>
  `.trim();
};

export const generateConsentHTML = (data: ConsentData): string => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termo de Consentimento - ${escapeHtml(data.patientName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.8; color: #333; padding: 30px; background: #fff; }
    .document { max-width: 800px; margin: 0 auto; padding: 35px; border: 1px solid #ccc; }
    .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #333; }
    .clinic-name { font-size: 20px; font-weight: bold; }
    .clinic-info { font-size: 11px; color: #666; margin-top: 5px; }
    .document-title { font-size: 18px; font-weight: bold; text-transform: uppercase; text-align: center; margin: 25px 0; }
    .procedure-name { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 10px; }
    .checkbox-item { margin: 8px 0; display: flex; align-items: flex-start; gap: 8px; }
    .checkbox { width: 15px; height: 15px; border: 1px solid #333; flex-shrink: 0; margin-top: 3px; }
    .patient-box { background: #f0f8ff; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature-block { width: 45%; text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
    .signature-name { font-weight: bold; }
    .signature-title { font-size: 11px; color: #666; }
    .date-field { text-align: right; margin-top: 30px; }
    .watermark { position: fixed; bottom: 10px; right: 10px; font-size: 9px; color: #999; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="clinic-name">${escapeHtml(data.clinicName)}</div>
      <div class="clinic-info">CNPJ: ${escapeHtml(data.clinicCnpj)} | ${escapeHtml(data.clinicAddress)} | Tel: ${escapeHtml(data.clinicPhone)}</div>
    </div>
    
    <div class="document-title">TERMO DE CONSENTIMENTO INFORMADO</div>
    
    <div class="patient-box">
      <strong>Paciente:</strong> ${escapeHtml(data.patientName)} &nbsp;|&nbsp; <strong>CPF:</strong> ${escapeHtml(data.patientCpf)}
    </div>
    
    <p style="text-align: justify; margin: 20px 0;">
      Eu, abaixo assinado, declaro que fui informado(a) de forma clara e objetiva sobre o procedimento a ser realizado, seus benefícios, riscos, alternativas e demais informações relevantes. Após receber todas as informações e ter minhas dúvidas esclarecidas, manifesto meu consentimento livre e espontâneo para a realização do procedimento.
    </p>
    
    <div class="procedure-name">${escapeHtml(data.procedure)}</div>
    
    ${data.benefits ? `
    <div class="section">
      <div class="section-title">BENEFÍCIOS ESPERADOS:</div>
      <p>${escapeHtml(data.benefits)}</p>
    </div>
    ` : ''}
    
    ${data.risks ? `
    <div class="section">
      <div class="section-title">RISCO E POSSÍVEIS COMPLICAÇÕES:</div>
      <p>${escapeHtml(data.risks)}</p>
    </div>
    ` : ''}
    
    ${data.alternatives ? `
    <div class="section">
      <div class="section-title">ALTERNATIVAS AO TRATAMENTO:</div>
      <p>${escapeHtml(data.alternatives)}</p>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">DECLARAÇÕES:</div>
      <div class="checkbox-item"><div class="checkbox"></div><span>Declaro que recebi e compreendi todas as informações fornecidas.</span></div>
      <div class="checkbox-item"><div class="checkbox"></div><span>Autorizo a realização do procedimento descrito acima.</span></div>
      <div class="checkbox-item"><div class="checkbox"></div><span>Autorizo o uso de imagens para documentação científica, se necessário.</span></div>
      <div class="checkbox-item"><div class="checkbox"></div><span>Estou ciente de que posso revogar este consentimento a qualquer momento.</span></div>
    </div>
    
    <div class="date-field">${data.city}, ${formatDate(data.date)}</div>
    
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-line">
          <div class="signature-name">${escapeHtml(data.patientName)}</div>
          <div class="signature-title">Paciente ou Responsável Legal</div>
        </div>
      </div>
      
      <div class="signature-block">
        <div class="signature-line">
          <div class="signature-name">${escapeHtml(data.professionalName)}</div>
          <div class="signature-title">Profissional Responsável</div>
          ${data.professionalCro ? `<div style="border:1px solid #333; display:inline-block; padding:4px 8px; font-size:10px; margin-top:8px;">CRO/CRM: ${escapeHtml(data.professionalCro)}</div>` : ''}
        </div>
      </div>
    </div>
    
    <div class="watermark">Clinxia - Sistema de Gestão para Clínicas</div>
  </div>
</body>
</html>
  `.trim();
};
