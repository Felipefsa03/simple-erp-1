import { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, Eye, Check, XCircle, Save, Trash2, Edit3, Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn, uid, formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { Modal, ConfirmDialog, EmptyState } from '@/components/shared';
import { emitirNFe, cancelarNFe, consultarNFe, isNFeConfigured, loadNFeConfig, type NFeEmissao, type NFeDestinatario, type NFeItem, type NFeResponse } from '@/services/nfe/nfeService';

interface NFePanelProps {
  clinicId?: string;
}

interface NFe {
  id: string;
  referencia?: string;
  number: string;
  serie: string;
  key: string;
  customer: string;
  cpfCnpj: string;
  value: number;
  status: 'pending' | 'authorized' | 'cancelled' | 'processing' | 'rejected';
  date: string;
  authorizationCode: string | null;
  protocolo?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  createdAt: string;
}

export function NFePanel({ clinicId }: NFePanelProps) {
  const [invoices, setInvoices] = useState<NFe[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NFe | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [emitindo, setEmitindo] = useState(false);
  const [form, setForm] = useState<Partial<NFe>>({});
  const [itensForm, setItensForm] = useState<NFeItem[]>([{ codigo: '001', descricao: '', ncm: '96190000', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 0, valorTotal: 0 }]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [nfeConfigured, setNfeConfigured] = useState(false);

  useEffect(() => {
    setNfeConfigured(isNFeConfigured());
  }, []);

  const saveNfes = (nfes: NFe[]) => {
    setInvoices(nfes);
  };

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return invoices;
    return invoices.filter(i => i.status === filterStatus);
  }, [invoices, filterStatus]);

  const stats = useMemo(() => ({
    total: invoices.length,
    authorized: invoices.filter(i => i.status === 'authorized').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    processing: invoices.filter(i => i.status === 'processing').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
    totalValue: invoices.filter(i => i.status === 'authorized').reduce((s, i) => s + i.value, 0),
  }), [invoices]);

  const nextNumber = useMemo(() => {
    const maxNum = invoices.reduce((max, i) => Math.max(max, parseInt(i.number) || 0), 0);
    return String(maxNum + 1).padStart(3, '0');
  }, [invoices]);

  const openNew = () => {
    setEditing(null);
    setForm({ number: nextNumber, serie: '1', customer: '', cpfCnpj: '', date: new Date().toISOString().split('T')[0] });
    setItensForm([{ codigo: '001', descricao: '', ncm: '96190000', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 0, valorTotal: 0 }]);
    setShowModal(true);
  };

  const openEdit = (nfe: NFe) => {
    setEditing(nfe);
    setForm({ ...nfe });
    setShowModal(true);
  };

  const addItem = () => {
    setItensForm(prev => [...prev, { codigo: String(prev.length + 1).padStart(3, '0'), descricao: '', ncm: '96190000', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 0, valorTotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (itensForm.length > 1) {
      setItensForm(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof NFeItem, value: any) => {
    setItensForm(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantidade' || field === 'valorUnitario') {
        updated.valorTotal = updated.quantidade * updated.valorUnitario;
      }
      return updated;
    }));
  };

  const handleEmitir = async () => {
    if (!nfeConfigured) {
      toast('Configure a NFe em Configurações > NFe antes de emitir.', 'error');
      return;
    }
    if (!form.customer?.trim()) { toast('Cliente é obrigatório.', 'error'); return; }
    if (!form.cpfCnpj?.trim()) { toast('CPF/CNPJ é obrigatório.', 'error'); return; }

    const itensValidos = itensForm.filter(i => i.descricao && i.valorTotal > 0);
    if (itensValidos.length === 0) { toast('Adicione pelo menos um item válido.', 'error'); return; }

    setEmitindo(true);

    const isCnpj = form.cpfCnpj.replace(/\D/g, '').length > 11;
    const destinatario: NFeDestinatario = isCnpj
      ? { cnpj: form.cpfCnpj, razaoSocial: form.customer }
      : { cpf: form.cpfCnpj, razaoSocial: form.customer };

    const emissao: NFeEmissao = {
      numero: form.number,
      serie: form.serie,
      naturezaOperacao: 'Venda de serviços',
      destinatario,
      itens: itensValidos,
      observacoes: form.customer,
    };

    const config = loadNFeConfig();

    if (!config || config.environment === 'homologacao') {
      const nfe: NFe = {
        id: uid(),
        referencia: `demo-${Date.now()}`,
        number: form.number || nextNumber,
        serie: form.serie || '1',
        key: Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join(''),
        customer: form.customer!,
        cpfCnpj: form.cpfCnpj!,
        value: itensValidos.reduce((s, i) => s + i.valorTotal, 0),
        status: 'authorized',
        date: form.date || new Date().toISOString().split('T')[0],
        authorizationCode: Array.from({ length: 21 }, () => Math.floor(Math.random() * 10)).join(''),
        protocolo: Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join(''),
        createdAt: new Date().toISOString(),
      };
      saveNfes([...invoices, nfe]);
      toast('NFe emitida com sucesso! (Modo homologação)', 'success');
      setShowModal(false);
      setEmitindo(false);
      return;
    }

    const result = await emitirNFe(emissao);

    if (result.sucesso) {
      const nfe: NFe = {
        id: uid(),
        referencia: result.referencia,
        number: result.numero || form.number || nextNumber,
        serie: result.serie || form.serie || '1',
        key: result.chave || '',
        customer: form.customer!,
        cpfCnpj: form.cpfCnpj!,
        value: itensValidos.reduce((s, i) => s + i.valorTotal, 0),
        status: 'authorized',
        date: form.date || new Date().toISOString().split('T')[0],
        authorizationCode: result.codigoAutorizacao || null,
        protocolo: result.protocolo,
        xmlUrl: result.xmlUrl,
        pdfUrl: result.pdfUrl,
        createdAt: new Date().toISOString(),
      };
      saveNfes([...invoices, nfe]);
      toast('NFe autorizada pela SEFAZ!', 'success');
      setShowModal(false);
    } else if (result.status === 'processando') {
      const nfe: NFe = {
        id: uid(),
        referencia: result.referencia,
        number: form.number || nextNumber,
        serie: form.serie || '1',
        key: '',
        customer: form.customer!,
        cpfCnpj: form.cpfCnpj!,
        value: itensValidos.reduce((s, i) => s + i.valorTotal, 0),
        status: 'processing',
        date: form.date || new Date().toISOString().split('T')[0],
        authorizationCode: null,
        createdAt: new Date().toISOString(),
      };
      saveNfes([...invoices, nfe]);
      toast('NFe em processamento. Consulte em alguns segundos.', 'info');
      setShowModal(false);
    } else {
      toast(`Erro: ${result.mensagem || 'Falha na emissão'}`, 'error');
    }
    setEmitindo(false);
  };

  const handleConsultar = async (nfe: NFe) => {
    if (!nfe.referencia) return;
    const result = await consultarNFe(nfe.referencia);
    if (result.sucesso) {
      saveNfes(invoices.map(i => i.id === nfe.id ? {
        ...i,
        status: 'authorized',
        key: result.chave || i.key,
        authorizationCode: result.codigoAutorizacao || i.authorizationCode,
        protocolo: result.protocolo || i.protocolo,
        xmlUrl: result.xmlUrl || i.xmlUrl,
        pdfUrl: result.pdfUrl || i.pdfUrl,
      } : i));
      toast('NFe atualizada!', 'success');
    } else {
      toast(`Status: ${result.status} - ${result.mensagem || ''}`, 'info');
    }
  };

  const handleCancelar = async (nfe: NFe) => {
    if (!nfe.referencia && !nfe.key) {
      saveNfes(invoices.map(i => i.id === nfe.id ? { ...i, status: 'cancelled' } : i));
      toast('NFe cancelada.', 'success');
      return;
    }
    const justificativa = 'Cancelamento solicitado pelo emitente';
    const result = await cancelarNFe(nfe.referencia || nfe.key, justificativa);
    if (result.sucesso) {
      saveNfes(invoices.map(i => i.id === nfe.id ? { ...i, status: 'cancelled' } : i));
      toast('NFe cancelada junto à SEFAZ.', 'success');
    } else {
      toast(`Erro ao cancelar: ${result.mensagem}`, 'error');
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      saveNfes(invoices.filter(i => i.id !== deleteId));
      toast('NFe removida.', 'success');
      setDeleteId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-brand-100 text-brand-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'authorized': return 'Autorizada';
      case 'pending': return 'Pendente';
      case 'processing': return 'Processando';
      case 'cancelled': return 'Cancelada';
      case 'rejected': return 'Rejeitada';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            NFe - Nota Fiscal Eletrônica
          </h1>
          <p className="text-sm text-slate-500 mt-1">Emita notas fiscais eletrônicas via SEFAZ</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" /> Nova NFe
        </button>
      </div>

      {!nfeConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">NFe não configurada</p>
            <p className="text-sm text-yellow-700 mt-1">Para emitir notas fiscais reais, configure em <strong>Configurações &gt; NFe</strong>. Sem configuração, as emissões funcionam em modo demonstração.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Autorizadas</p>
          <p className="text-xl font-bold text-emerald-600">{stats.authorized}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Processando</p>
          <p className="text-xl font-bold text-brand-600">{stats.processing}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Canceladas</p>
          <p className="text-xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Valor Autorizado</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none">
          <option value="all">Todos os status</option>
          <option value="authorized">Autorizada</option>
          <option value="processing">Processando</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">NFe</th>
              <th className="px-4 py-3">Chave</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-900">NFe {inv.number}</span>
                  <div className="text-xs text-slate-400">Série {inv.serie}</div>
                </td>
                <td className="px-4 py-3">
                  {inv.key ? (
                    <span className="font-mono text-xs text-slate-500">{inv.key.slice(0, 10)}...{inv.key.slice(-6)}</span>
                  ) : <span className="text-xs text-slate-400">-</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{inv.customer}</div>
                  <div className="text-xs text-slate-400">{inv.cpfCnpj}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(inv.value)}</td>
                <td className="px-4 py-3 text-slate-600">{inv.date.split('-').reverse().join('/')}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", getStatusColor(inv.status))}>
                    {getStatusLabel(inv.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {inv.status === 'processing' && (
                      <button onClick={() => handleConsultar(inv)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Consultar status">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {inv.status === 'authorized' && (
                      <button onClick={() => handleCancelar(inv)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Ver DANFE">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {inv.xmlUrl && (
                      <a href={inv.xmlUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Baixar XML">
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => setDeleteId(inv.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <EmptyState icon={FileText} title="Nenhuma NFe encontrada" description="Crie sua primeira nota fiscal eletrônica." />
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Emitir NFe" maxWidth="max-w-3xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Número</label>
              <input type="text" value={form.number || ''} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Série</label>
              <input type="text" value={form.serie || ''} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente *</label>
            <input type="text" value={form.customer || ''} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm" placeholder="Nome ou Razão Social" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">CPF ou CNPJ *</label>
            <input type="text" value={form.cpfCnpj || ''} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm" placeholder="000.000.000-00 ou 00.000.000/0000-00" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Itens da NFe *</label>
              <button onClick={addItem} className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Adicionar item</button>
            </div>
            <div className="space-y-2">
              {itensForm.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded-xl p-3">
                  <div className="col-span-4">
                    {idx === 0 && <label className="block text-xs text-slate-500 mb-1">Descrição *</label>}
                    <input type="text" value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" placeholder="Descrição do serviço/produto" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-xs text-slate-500 mb-1">NCM</label>}
                    <input type="text" value={item.ncm} onChange={e => updateItem(idx, 'ncm', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" placeholder="96190000" />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <label className="block text-xs text-slate-500 mb-1">Qtd</label>}
                    <input type="number" min="1" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseFloat(e.target.value) || 1)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-xs text-slate-500 mb-1">Valor Unit.</label>}
                    <input type="number" step="0.01" min="0" value={item.valorUnitario} onChange={e => updateItem(idx, 'valorUnitario', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" placeholder="0,00" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-xs text-slate-500 mb-1">Total</label>}
                    <div className="px-2 py-1.5 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700">{formatCurrency(item.valorTotal)}</div>
                  </div>
                  <div className="col-span-1">
                    {itensForm.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-sm font-semibold text-slate-900">
              Total: {formatCurrency(itensForm.reduce((s, i) => s + i.valorTotal, 0))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleEmitir} disabled={emitindo} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-sm font-medium disabled:opacity-50">
              {emitindo ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Emitindo...</>
              ) : (
                <><Check className="w-4 h-4" /> Emitir NFe</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remover NFe" message="Tem certeza que deseja remover esta nota fiscal?" confirmLabel="Remover" variant="danger" />
    </div>
  );
}
