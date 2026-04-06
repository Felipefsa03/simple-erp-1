// ============================================
// LuminaFlow - Módulo TISS (Troca de Informações de Saúde Suplementar)
// Implementação para geração e validação de xml TISS
// ============================================

const TISS_VERSION = '3.05.00';
const TISS_SCHEMA_VERSION = 'versao=3.05.00';

const getTISSVersion = () => TISS_VERSION;

const generateTISS = (data = {}) => {
  const {
    procedimento = {},
    valor = 0,
    paciente = {},
    prestador = {},
    detalheProcedimento = '',
  } = data;

  const now = new Date();
  const dataAtual = now.toISOString().split('T')[0];
  const horaAtual = now.toTimeString().split(' ')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ans:tissXml xmlns:ans="http://www.ans.gov.br/padroes/tiss">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${Date.now()}</ans:sequencialTransacao>
      <ans:dataTransacao>${dataAtual}</ans:dataTransacao>
      <ans:horaTransacao>${horaAtual}</ans:horaTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:codigoPrestadorNaOperadora>${prestador.codigo || ''}</ans:codigoPrestadorNaOperadora>
      <ans:nomePrestador>${prestador.nome || ''}</ans:nomePrestador>
    </ans:origem>
    <ans:destino>
      <ans:codigoOperadora>${paciente.codigoOperadora || ''}</ans:codigoOperadora>
    </ans:destino>
    <ans:versaoPadrao>${TISS_VERSION}</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestador>
    <ans:codigoPrestador>${prestador.codigo || ''}</ans:codigoPrestador>
    <ans:nomePrestador>${prestador.nome || ''}</ans:nomePrestador>
  </ans:prestador>
  <ans:beneficiario>
    <ans:numeroCarteira>${paciente.numeroCarteira || ''}</ans:numeroCarteira>
    <ans:nomeBeneficiario>${paciente.nome || ''}</ans:nomeBeneficiario>
    <ans:codigoDependencia>${paciente.codigoDependencia || '00'}</ans:codigoDependencia>
  </ans:beneficiario>
  <ans:procedimentos>
    <ans:procedimento>
      <ans:codigoProcedimento>${procedimento.codigo || ''}</ans:codigoProcedimento>
      <ans:descricaoProcedimento>${procedimento.descricao || ''}</ans:descricaoProcedimento>
      <ans:valorProcedimento>${valor.toFixed(2)}</ans:valorProcedimento>
    </ans:procedimento>
  </ans:procedimentos>
  <ans:total>
    <ans:valorTotal>${valor.toFixed(2)}</ans:valorTotal>
  </ans:total>
</ans:tissXml>`;

  return { xml, version: TISS_VERSION };
};

const validateTISS = (xml) => {
  if (!xml || typeof xml !== 'string') {
    return { valid: false, error: 'XML inválido ou vazio' };
  }

  const requiredElements = [
    'ans:tissXml',
    'ans:cabecalho',
    'ans:identificacaoTransacao',
    'ans:prestador',
    'ans:beneficiario',
    'ans:procedimentos',
  ];

  for (const element of requiredElements) {
    if (!xml.includes(element)) {
      return { valid: false, error: `Elemento ausente: ${element}` };
    }
  }

  if (!xml.includes('versaoPadrao')) {
    return { valid: false, error: 'Versão do padrão não especificada' };
  }

  return { valid: true };
};

const parseTISS = (xml) => {
  const { valid, error } = validateTISS(xml);
  if (!valid) {
    throw new Error(error);
  }

  const getValue = (tag) => {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    versao: getValue('versaoPadrao'),
    tipoTransacao: getValue('tipoTransacao'),
    dataTransacao: getValue('dataTransacao'),
    horaTransacao: getValue('horaTransacao'),
    codigoPrestador: getValue('codigoPrestador'),
    nomePrestador: getValue('nomePrestador'),
    numeroCarteira: getValue('numeroCarteira'),
    nomeBeneficiario: getValue('nomeBeneficiario'),
    valorTotal: getValue('valorTotal'),
  };
};

module.exports = {
  getTISSVersion,
  generateTISS,
  validateTISS,
  parseTISS,
};
