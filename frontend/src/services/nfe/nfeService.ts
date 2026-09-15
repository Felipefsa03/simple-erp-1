// Frontend NF-e client. Credentials and provider calls stay exclusively in
// the authenticated backend proxy; this module never contacts a fiscal API.
import { getSupabaseSession } from '@/lib/supabase';

export type NFeProvider = 'focus_nfe';

export interface NFeConfig {
  provider: NFeProvider;
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string;
  environment: 'homologacao' | 'producao';
  certificateBase64?: string;
  certificatePassword?: string;
  cnpj: string;
  ie: string;
  razaoSocial: string;
  nomeFantasia?: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  regimeTributario: '1' | '2' | '3';
}

export interface NFeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  origem?: string;
  csosn?: string;
  cst?: string;
  aliquotaIcms?: number;
  aliquotaPis?: number;
  aliquotaCofins?: number;
}

export interface NFeDestinatario {
  cpf?: string;
  cnpj?: string;
  razaoSocial: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  indicadorIE?: '1' | '2' | '9';
  ie?: string;
}

export interface NFeEmissao {
  numero?: string;
  serie?: string;
  naturezaOperacao?: string;
  destinatario: NFeDestinatario;
  itens: NFeItem[];
  valorFrete?: number;
  valorSeguro?: number;
  valorDesconto?: number;
  valorOutrasDespesas?: number;
  observacoes?: string;
  formaPagamento?: string;
  valorPagamento?: number;
}

export interface NFeResponse {
  sucesso: boolean;
  status: 'autorizado' | 'processando' | 'rejeitado' | 'cancelado' | 'erro';
  numero?: string;
  serie?: string;
  chave?: string;
  codigoAutorizacao?: string;
  dataAutorizacao?: string;
  protocolo?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  mensagem?: string;
  erros?: string[];
  referencia?: string;
}

let currentConfig: NFeConfig | null = null;

const getNFeAuthHeaders = () => {
  const session = getSupabaseSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
};

export function configureNFe(config: NFeConfig) {
  currentConfig = { ...config, provider: 'focus_nfe' };
}

export function loadNFeConfig(): NFeConfig | null {
  return currentConfig;
}

export async function loadNFeServerConfig(clinicId?: string) {
  const query = clinicId ? `?clinicId=${encodeURIComponent(clinicId)}` : '';
  const response = await fetch(`/api/nfe/config${query}`, { headers: getNFeAuthHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a configuração fiscal.');
  if (data.config) configureNFe(data.config);
  return data.config;
}

export async function saveNFeServerConfig(config: NFeConfig, clinicId?: string) {
  const response = await fetch('/api/nfe/config', {
    method: 'POST',
    headers: getNFeAuthHeaders(),
    body: JSON.stringify({ clinicId, config: { ...config, provider: 'focus_nfe' } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a configuração fiscal.');
  if (data.config) configureNFe(data.config);
  return data.config;
}

export async function testNFeConnection(clinicId?: string) {
  const response = await fetch('/api/nfe/test', {
    method: 'POST',
    headers: getNFeAuthHeaders(),
    body: JSON.stringify({ clinicId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível conectar ao provedor fiscal.');
  return data;
}

export function getNFeConfig(): NFeConfig | null {
  return currentConfig;
}

export function isNFeConfigured(): boolean {
  return Boolean(currentConfig?.cnpj);
}

const normalizeResponse = (data: any, referencia?: string): NFeResponse => {
  const providerStatus = String(data?.status || '').trim().toLowerCase();
  // A Focus NFe confirma o recebimento assíncrono antes da autorização.
  // Nunca trate um HTTP 2xx ou um "ok" genérico como autorização da SEFAZ.
  const status: NFeResponse['status'] = providerStatus === 'autorizado'
    ? 'autorizado'
    : providerStatus === 'cancelado'
      ? 'cancelado'
      : providerStatus.includes('processando')
        ? 'processando'
        : providerStatus.includes('rejeit')
          ? 'rejeitado'
          : 'erro';

  return {
  sucesso: status === 'autorizado',
  status,
  numero: data.numero,
  serie: data.serie,
  chave: data.chave,
  codigoAutorizacao: data.codigo_autorizacao,
  dataAutorizacao: data.data_autorizacao,
  protocolo: data.numero_protocolo_autorizacao,
  xmlUrl: data.caminho_xml_autorizacao,
  pdfUrl: data.caminho_danfe,
  mensagem: data.mensagem_sefaz || data.error,
  erros: data.erros,
  referencia,
  };
};

const buildProviderPayload = (emissao: NFeEmissao) => ({
  presenca_comprador: '9',
  natureza_operacao: emissao.naturezaOperacao || 'Venda',
  serie: emissao.serie || '1',
  numero: emissao.numero,
  data_emissao: new Date().toISOString(),
  tipo_documento: '1',
  finalidade_emissao: '1',
  destinatario: {
    ...(emissao.destinatario.cnpj
      ? { cnpj: emissao.destinatario.cnpj.replace(/\D/g, ''), razao_social: emissao.destinatario.razaoSocial }
      : { cpf: emissao.destinatario.cpf?.replace(/\D/g, ''), nome_consumidor: emissao.destinatario.razaoSocial }),
    email: emissao.destinatario.email,
  },
  itens: emissao.itens.map((item, index) => ({
    numero_item: index + 1,
    codigo_produto: item.codigo,
    descricao: item.descricao,
    cfop: item.cfop || '5102',
    unidade_comercial: item.unidade || 'UN',
    quantidade_comercial: item.quantidade,
    valor_unitario_comercial: item.valorUnitario,
    valor_total_bruto: item.valorTotal,
    codigo_ncm: item.ncm || '96190000',
    origem: item.origem || '0',
  })),
  valor_frete: emissao.valorFrete || 0,
  valor_desconto: emissao.valorDesconto || 0,
  informacoes_adicionais_contribuinte: emissao.observacoes || '',
});

export async function emitirNFe(emissao: NFeEmissao): Promise<NFeResponse> {
  const referencia = `clinxia-${Date.now()}`;
  const response = await fetch(`/api/nfe/emitir?ref=${encodeURIComponent(referencia)}`, {
    method: 'POST',
    headers: getNFeAuthHeaders(),
    body: JSON.stringify({ payload: buildProviderPayload(emissao) }),
  });
  const data = await response.json().catch(() => ({}));
  return normalizeResponse(data, referencia);
}

export async function consultarNFe(referencia: string): Promise<NFeResponse> {
  const response = await fetch(`/api/nfe/consultar/${encodeURIComponent(referencia)}`, { headers: getNFeAuthHeaders() });
  const data = await response.json().catch(() => ({}));
  return normalizeResponse(data, referencia);
}

export async function cancelarNFe(referencia: string, justificativa: string): Promise<NFeResponse> {
  const response = await fetch(`/api/nfe/cancelar/${encodeURIComponent(referencia)}`, {
    method: 'DELETE',
    headers: getNFeAuthHeaders(),
    body: JSON.stringify({ justificativa }),
  });
  const data = await response.json().catch(() => ({}));
  const normalized = normalizeResponse(data, referencia);
  return { ...normalized, sucesso: normalized.status === 'cancelado' };
}

export const NFE_CFOP_PADRAO = { vendaInterna: '5102', vendaInternaST: '5405', revenda: '5102', servico: '5933', devolucao: '5202', transferencia: '5152', amostra: '5915' };
export const NFE_CSOSN_PADRAO = { isento: '102', tributadaSemCobranca: '102', tributadaComPermissaoCredito: '101', tributadaSemPermissaoCredito: '103', monofasico: '500' };
export const NFE_FORMA_PAGAMENTO = { dinheiro: '01', cheque: '02', cartaoCredito: '03', cartaoDebito: '04', creditoLoja: '05', pix: '17', boleto: '15', semPagamento: '90' };
export const NFE_UNIDADES = ['UN', 'CX', 'PCT', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'M2', 'M3', 'PAR', 'DZ', 'HR', 'DI', 'SE', 'MES', 'ANO', 'KT', 'RES'];
