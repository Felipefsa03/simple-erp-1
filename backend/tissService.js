// Geração/validação local de documentos TISS. A geração não autoriza nem
// transmite uma guia: o envio para operadoras exige um adaptador homologado.
const TISS_VERSION = '3.05.00';

const getTISSVersion = () => TISS_VERSION;
const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const money = (value) => Number(value || 0).toFixed(2).replace(/\.00$/, '');

const generateTISS = (data = {}) => {
  const procedimento = data.procedimento || {};
  const valor = Number(data.valor || 0);
  const prestador = data.prestador || {};
  const beneficiario = data.beneficiario || data.paciente || {};
  const protocol = `TISS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const dataAtual = now.toISOString().split('T')[0];
  const horaAtual = now.toTimeString().split(' ')[0];
  const codigoPrestador = prestador.codigo || '000000';
  const cnpjPrestador = prestador.cnpj || '';
  const nomePrestador = prestador.nome || prestador.razaoSocial || '';
  const codigoProcedimento = procedimento.codigo || '';
  const descricaoProcedimento = procedimento.descricao || '';
  const nomeBeneficiario = beneficiario.nome || beneficiario.nomeBeneficiario || '';
  const carteira = beneficiario.carteira || beneficiario.numeroCarteira || '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ans:tissXml xmlns:ans="http://www.ans.gov.br/padroes/tiss">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${escapeXml(protocol)}</ans:sequencialTransacao>
      <ans:dataTransacao>${dataAtual}</ans:dataTransacao>
      <ans:horaTransacao>${horaAtual}</ans:horaTransacao>
    </ans:identificacaoTransacao>
    <ans:origem><ans:codigoPrestadorNaOperadora>${escapeXml(codigoPrestador)}</ans:codigoPrestadorNaOperadora><ans:nomePrestador>${escapeXml(nomePrestador)}</ans:nomePrestador></ans:origem>
    <ans:destino><ans:codigoOperadora>${escapeXml(beneficiario.codigoOperadora || '')}</ans:codigoOperadora></ans:destino>
    <ans:versaoPadrao>${TISS_VERSION}</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestador>
    <ans:codigoPrestador>${escapeXml(codigoPrestador)}</ans:codigoPrestador>
    <ans:cnpjPrestador>${escapeXml(cnpjPrestador)}</ans:cnpjPrestador>
    <ans:nomePrestador>${escapeXml(nomePrestador)}</ans:nomePrestador>
  </ans:prestador>
  <ans:beneficiario>
    <ans:numeroCarteira>${escapeXml(carteira)}</ans:numeroCarteira>
    <ans:nomeBeneficiario>${escapeXml(nomeBeneficiario)}</ans:nomeBeneficiario>
    <ans:codigoDependencia>${escapeXml(beneficiario.codigoDependencia || '00')}</ans:codigoDependencia>
  </ans:beneficiario>
  <ans:procedimentos>
    <ans:procedimento>
      <ans:codigoProcedimento>${escapeXml(codigoProcedimento)}</ans:codigoProcedimento>
      <ans:descricaoProcedimento>${escapeXml(descricaoProcedimento)}</ans:descricaoProcedimento>
      <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
      <ans:valorProcedimento>${money(valor)}</ans:valorProcedimento>
    </ans:procedimento>
  </ans:procedimentos>
  <ans:total><ans:valorTotal>${money(valor)}</ans:valorTotal></ans:total>
</ans:tissXml>`;
  return { xml, protocol, generatedAt: now.toISOString(), version: TISS_VERSION };
};

const validateTISS = (xml) => {
  if (!xml || typeof xml !== 'string') return { valid: false, missing: ['xml'], error: 'XML inválido ou vazio' };
  const required = ['ans:tissXml', 'ans:cabecalho', 'ans:identificacaoTransacao', 'ans:prestador', 'ans:beneficiario', 'ans:procedimentos'];
  const missing = required.filter((element) => !xml.includes(element)).map((element) => element.replace('ans:', ''));
  if (!xml.includes('versaoPadrao')) missing.push('versaoPadrao');
  return { valid: missing.length === 0, missing, ...(missing.length ? { error: `Elementos ausentes: ${missing.join(', ')}` } : {}) };
};

const parseTISS = (xml) => {
  const result = validateTISS(xml);
  if (!result.valid) throw new Error(result.error);
  const getValue = (tag) => xml.match(new RegExp(`<ans:${tag}[^>]*>([^<]*)</ans:${tag}>`))?.[1]?.trim() || '';
  return {
    versao: getValue('versaoPadrao'), tipoTransacao: getValue('tipoTransacao'), dataTransacao: getValue('dataTransacao'),
    horaTransacao: getValue('horaTransacao'), codigoPrestador: getValue('codigoPrestador'),
    nomePrestador: getValue('nomePrestador'), numeroCarteira: getValue('numeroCarteira'),
    nomeBeneficiario: getValue('nomeBeneficiario'), valorTotal: getValue('valorTotal'),
  };
};

const getSupportedOperators = () => [
  { codigo: '001', nome: 'Unimed' },
  { codigo: '005', nome: 'Amil' },
  { codigo: '006', nome: 'Bradesco Saúde' },
  { codigo: '007', nome: 'SulAmérica' },
];

export { getTISSVersion, generateTISS, validateTISS, parseTISS, getSupportedOperators };
