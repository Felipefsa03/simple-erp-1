// ============================================
// LuminaFlow ERP - NFe Integration Service
// Suporte a provedores reais de emissão de NF-e
// ============================================

export type NFeProvider = 'focus_nfe' | 'nfe_io' | 'webmaniabr';

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
  formaPagamento?: '01' | '02' | '03' | '04' | '05' | '10' | '11' | '12' | '13' | '14' | '15' | '90' | '99';
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

// ============================================
// Focus NFe Provider
// ============================================
class FocusNFeService {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: NFeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.environment === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${btoa(this.apiKey + ':')}`,
      'Content-Type': 'application/json',
    };
  }

  async emitir(referencia: string, dados: any): Promise<NFeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe?ref=${referencia}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (response.ok && data.status === 'autorizado') {
        return {
          sucesso: true,
          status: 'autorizado',
          numero: data.numero,
          serie: data.serie,
          chave: data.chave,
          codigoAutorizacao: data.caminho_xml_autorizacao,
          dataAutorizacao: data.data_autorizacao,
          protocolo: data.numero_protocolo_autorizacao,
          xmlUrl: data.caminho_xml_autorizacao,
          pdfUrl: data.caminho_danfe,
          referencia,
        };
      }

      if (data.status === 'processando') {
        return {
          sucesso: false,
          status: 'processando',
          mensagem: 'NFe em processamento. Consulte novamente em alguns segundos.',
          referencia,
        };
      }

      return {
        sucesso: false,
        status: 'rejeitado',
        mensagem: data.mensagem_sefaz || data.status || 'Erro desconhecido',
        erros: data.erros?.map((e: any) => e.mensagem || e),
        referencia,
      };
    } catch (error) {
      return {
        sucesso: false,
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro de conexão',
        referencia,
      };
    }
  }

  async consultar(referencia: string): Promise<NFeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe/${referencia}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      return {
        sucesso: data.status === 'autorizado',
        status: data.status,
        numero: data.numero,
        serie: data.serie,
        chave: data.chave,
        dataAutorizacao: data.data_autorizacao,
        protocolo: data.numero_protocolo_autorizacao,
        xmlUrl: data.caminho_xml_autorizacao,
        pdfUrl: data.caminho_danfe,
        mensagem: data.mensagem_sefaz,
        referencia,
      };
    } catch (error) {
      return {
        sucesso: false,
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro de conexão',
        referencia,
      };
    }
  }

  async cancelar(referencia: string, justificativa: string): Promise<NFeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe/${referencia}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ justificativa }),
      });

      const data = await response.json();

      return {
        sucesso: response.ok,
        status: response.ok ? 'cancelado' : 'erro',
        mensagem: data.mensagem_sefaz || (response.ok ? 'Cancelado com sucesso' : 'Erro ao cancelar'),
        referencia,
      };
    } catch (error) {
      return {
        sucesso: false,
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro de conexão',
        referencia,
      };
    }
  }

  async inutilizar(numeroInicial: number, numeroFinal: number, justificativa: string, serie: number = 1): Promise<NFeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe/inutilizacao`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          numero_inicial: numeroInicial,
          numero_final: numeroFinal,
          serie,
          justificativa,
        }),
      });

      const data = await response.json();

      return {
        sucesso: response.ok,
        status: response.ok ? 'autorizado' : 'erro',
        mensagem: data.mensagem_sefaz || (response.ok ? 'Inutilizado com sucesso' : 'Erro ao inutilizar'),
      };
    } catch (error) {
      return {
        sucesso: false,
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro de conexão',
      };
    }
  }
}

// ============================================
// NFe.io Provider
// ============================================
class NFeIOService {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: NFeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.environment === 'producao'
      ? 'https://api.nfe.io'
      : 'https://api.sandbox.nfe.io';
  }

  private getHeaders() {
    return {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async emitir(referencia: string, dados: any): Promise<NFeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/notes`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (data.id) {
        return {
          sucesso: data.status === 'Authorized',
          status: data.status === 'Authorized' ? 'autorizado' : 'processando',
          numero: data.number,
          serie: data.series,
          chave: data.accessKey,
          protocolo: data.authorizationProtocol,
          xmlUrl: data.xml,
          pdfUrl: data.danfe,
          referencia: data.reference || referencia,
        };
      }

      return {
        sucesso: false,
        status: 'rejeitado',
        mensagem: data.message || 'Erro na emissão',
        erros: data.errors,
        referencia,
      };
    } catch (error) {
      return {
        sucesso: false,
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro de conexão',
        referencia,
      };
    }
  }

  async consultar(referencia: string): Promise<NFeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/notes/${referencia}`, {
        headers: this.getHeaders(),
      });

      const data = await response.json();

      return {
        sucesso: data.status === 'Authorized',
        status: data.status === 'Authorized' ? 'autorizado' : 'processando',
        numero: data.number,
        serie: data.series,
        chave: data.accessKey,
        protocolo: data.authorizationProtocol,
        xmlUrl: data.xml,
        pdfUrl: data.danfe,
        referencia,
      };
    } catch (error) {
      return {
        sucesso: false,
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro de conexão',
        referencia,
      };
    }
  }

  async cancelar(referencia: string, justificativa: string): Promise<NFeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/notes/${referencia}/cancellation`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason: justificativa }),
      });

      const data = await response.json();

      return {
        sucesso: response.ok,
        status: response.ok ? 'cancelado' : 'erro',
        mensagem: data.message || (response.ok ? 'Cancelado' : 'Erro ao cancelar'),
        referencia,
      };
    } catch (error) {
      return {
        sucesso: false,
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro de conexão',
        referencia,
      };
    }
  }
}

// ============================================
// Unified NFe Service
// ============================================
let currentConfig: NFeConfig | null = null;
let providerService: FocusNFeService | NFeIOService | null = null;

export function configureNFe(config: NFeConfig) {
  currentConfig = config;
  localStorage.setItem('luminaflow-nfe-config', JSON.stringify(config));

  switch (config.provider) {
    case 'focus_nfe':
      providerService = new FocusNFeService(config);
      break;
    case 'nfe_io':
      providerService = new NFeIOService(config);
      break;
    case 'webmaniabr':
      providerService = new FocusNFeService(config);
      break;
    default:
      providerService = new FocusNFeService(config);
  }
}

export function loadNFeConfig(): NFeConfig | null {
  if (currentConfig) return currentConfig;
  const stored = localStorage.getItem('luminaflow-nfe-config');
  if (stored) {
    try {
      const config = JSON.parse(stored) as NFeConfig;
      configureNFe(config);
      return config;
    } catch {
      return null;
    }
  }
  return null;
}

export function getNFeConfig(): NFeConfig | null {
  return currentConfig;
}

export function isNFeConfigured(): boolean {
  const config = loadNFeConfig();
  return !!(config?.apiKey && config?.cnpj);
}

function buildFocusNFePayload(config: NFeConfig, emissao: NFeEmissao): any {
  const d = emissao.destinatario;
  const dest: any = {};

  if (d.cpf) {
    dest.cpf = d.cpf.replace(/\D/g, '');
    dest.nome_consumidor = d.razaoSocial;
  } else if (d.cnpj) {
    dest.cnpj = d.cnpj.replace(/\D/g, '');
    dest.razao_social = d.razaoSocial;
    if (d.ie) dest.ie = d.ie.replace(/\D/g, '');
    dest.indicador_ie = d.indicadorIE || '9';
  }

  if (d.logradouro) {
    dest.logradouro = d.logradouro;
    dest.numero = d.numero || 'SN';
    dest.bairro = d.bairro || 'Centro';
    dest.municipio = d.municipio || config.municipio;
    dest.uf = d.uf || config.uf;
    dest.cep = d.cep?.replace(/\D/g, '') || config.cep.replace(/\D/g, '');
  }

  if (d.email) dest.email = d.email;

  const itens = emissao.itens.map((item, i) => ({
    numero_item: i + 1,
    codigo_produto: item.codigo,
    descricao: item.descricao,
    cfop: item.cfop || '5102',
    unidade_comercial: item.unidade || 'UN',
    quantidade_comercial: item.quantidade,
    valor_unitario_comercial: item.valorUnitario,
    valor_total_bruto: item.valorTotal,
    unidade_tributavel: item.unidade || 'UN',
    quantidade_tributavel: item.quantidade,
    valor_unitario_tributavel: item.valorUnitario,
    ncm: item.ncm || '96190000',
    origem: item.origem || '0',
    informacoes_adicionais: item.descricao,
  }));

  return {
    presenca_comprador: '9',
    natureza_operacao: emissao.naturezaOperacao || 'Venda',
    serie: emissao.serie || '1',
    numero: emissao.numero,
    data_emissao: new Date().toISOString(),
    tipo_documento: '1',
    finalidade_emissao: '1',
    destinatario: dest,
    itens,
    valor_frete: emissao.valorFrete || 0,
    valor_seguro: emissao.valorSeguro || 0,
    valor_desconto: emissao.valorDesconto || 0,
    valor_outras_despesas: emissao.valorOutrasDespesas || 0,
    informacoes_adicionais_contribuinte: emissao.observacoes || '',
  };
}

export async function emitirNFe(emissao: NFeEmissao): Promise<NFeResponse> {
  const config = loadNFeConfig();

  if (!config) {
    return {
      sucesso: false,
      status: 'erro',
      mensagem: 'NFe não configurada. Acesse Configurações > NFe para configurar.',
    };
  }

  const referencia = `lumina-${Date.now()}`;

  // Tenta usar o backend proxy primeiro (mais seguro)
  try {
    const isCnpj = emissao.destinatario.cnpj;
    const payload = {
      presenca_comprador: '9',
      natureza_operacao: emissao.naturezaOperacao || 'Venda',
      serie: emissao.serie || '1',
      numero: emissao.numero,
      data_emissao: new Date().toISOString(),
      tipo_documento: '1',
      finalidade_emissao: '1',
      destinatario: {
        ...(isCnpj
          ? { cnpj: emissao.destinatario.cnpj?.replace(/\D/g, ''), razao_social: emissao.destinatario.razaoSocial }
          : { cpf: emissao.destinatario.cpf?.replace(/\D/g, ''), nome_consumidor: emissao.destinatario.razaoSocial }
        ),
        email: emissao.destinatario.email,
      },
      itens: emissao.itens.map((item, i) => ({
        numero_item: i + 1,
        codigo_produto: item.codigo,
        descricao: item.descricao,
        cfop: item.cfop || '5102',
        unidade_comercial: item.unidade || 'UN',
        quantidade_comercial: item.quantidade,
        valor_unitario_comercial: item.valorUnitario,
        valor_total_bruto: item.valorTotal,
        ncm: item.ncm || '96190000',
        origem: item.origem || '0',
      })),
      valor_frete: emissao.valorFrete || 0,
      valor_desconto: emissao.valorDesconto || 0,
      informacoes_adicionais_contribuinte: emissao.observacoes || '',
    };

    const response = await fetch(`/api/nfe/emitir?ref=${referencia}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (data.ok || data.status === 'autorizado') {
      return {
        sucesso: true,
        status: 'autorizado',
        numero: data.numero,
        serie: data.serie,
        chave: data.chave,
        dataAutorizacao: data.data_autorizacao,
        protocolo: data.numero_protocolo_autorizacao,
        xmlUrl: data.caminho_xml_autorizacao,
        pdfUrl: data.caminho_danfe,
        referencia,
      };
    }

    if (data.status === 'processando') {
      return { sucesso: false, status: 'processando', mensagem: 'NFe em processamento.', referencia };
    }

    return {
      sucesso: false,
      status: 'rejeitado',
      mensagem: data.mensagem_sefaz || data.status || 'Erro na emissão',
      erros: data.erros,
      referencia,
    };
  } catch (error) {
    return {
      sucesso: false,
      status: 'erro',
      mensagem: error instanceof Error ? error.message : 'Erro de conexão',
      referencia,
    };
  }
}

export async function consultarNFe(referencia: string): Promise<NFeResponse> {
  try {
    const response = await fetch(`/api/nfe/consultar/${referencia}`);
    const data = await response.json().catch(() => ({}));

    return {
      sucesso: data.status === 'autorizado' || data.ok,
      status: data.status || (data.ok ? 'autorizado' : 'erro'),
      numero: data.numero,
      serie: data.serie,
      chave: data.chave,
      dataAutorizacao: data.data_autorizacao,
      protocolo: data.numero_protocolo_autorizacao,
      xmlUrl: data.caminho_xml_autorizacao,
      pdfUrl: data.caminho_danfe,
      mensagem: data.mensagem_sefaz,
      referencia,
    };
  } catch (error) {
    return { sucesso: false, status: 'erro', mensagem: error instanceof Error ? error.message : 'Erro de conexão', referencia };
  }
}

export async function cancelarNFe(referencia: string, justificativa: string): Promise<NFeResponse> {
  try {
    const response = await fetch(`/api/nfe/cancelar/${referencia}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justificativa }),
    });

    const data = await response.json().catch(() => ({}));

    return {
      sucesso: response.ok || data.ok,
      status: response.ok ? 'cancelado' : 'erro',
      mensagem: data.mensagem_sefaz || (response.ok ? 'Cancelado com sucesso' : 'Erro ao cancelar'),
      referencia,
    };
  } catch (error) {
    return { sucesso: false, status: 'erro', mensagem: error instanceof Error ? error.message : 'Erro de conexão', referencia };
  }
}

export const NFE_CFOP_PADRAO = {
  vendaInterna: '5102',
  vendaInternaST: '5405',
  revenda: '5102',
  servico: '5933',
  devolucao: '5202',
  transferencia: '5152',
  amostra: '5915',
};

export const NFE_CSOSN_PADRAO = {
  isento: '102',
  tributadaSemCobranca: '102',
  tributadaComPermissaoCredito: '101',
  tributadaSemPermissaoCredito: '103',
  monofasico: '500',
};

export const NFE_FORMA_PAGAMENTO = {
  dinheiro: '01',
  cheque: '02',
  cartaoCredito: '03',
  cartaoDebito: '04',
  creditoLoja: '05',
  pix: '17',
  boleto: '15',
  semPagamento: '90',
};

export const NFE_UNIDADES = [
  'UN', 'CX', 'PCT', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'M2', 'M3',
  'PAR', 'DZ', 'HR', 'DI', 'SE', 'MES', 'ANO', 'KT', 'RES',
];
