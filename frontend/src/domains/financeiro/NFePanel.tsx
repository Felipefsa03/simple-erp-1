import { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, Eye, Check, XCircle, Save, Trash2, Edit3, Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useClinicStore } from '@/stores/clinicStore';
import { toast } from '@/hooks/useShared';
import { Modal, ConfirmDialog, EmptyState } from '@/components/shared';
import { emitirNFe, cancelarNFe, consultarNFe, isNFeConfigured, loadNFeConfig, type NFeEmissao, type NFeDestinatario, type NFeItem } from '@/services/nfe/nfeService';
import type { Invoice, InvoiceStatus } from '@/types/index';

interface NFePanelProps {
  clinicId?: string;
}

export function NFePanel({ clinicId }: NFePanelProps) {
  const { invoices, addInvoice, updateInvoice, deleteInvoice } = useClinicStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [emitindo, setEmitindo] = useState(false);
  const [form, setForm] = useState<Partial<Invoice>>({});
  const [itensForm, setItensForm] = useState<NFeItem[]>([{ codigo: '001', descricao: '', ncm: '96190000', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 0, valorTotal: 0 }]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [nfeConfigured, setNfeConfigured] = useState(false);

  useEffect(() => {
    setNfeConfigured(isNFeConfigured());
  }, []);

  const filtered = useMemo(() => {
    let filteredInvoices = invoices;
    if (clinicId) {
      filteredInvoices = invoices.filter(i => i.clinic_id === clinicId);
    }
    if (filterStatus === 'all') return filteredInvoices;
    return filteredInvoices.filter(i => i.status === filterStatus);
  }, [invoices, filterStatus, clinicId]);

  const stats = useMemo(() => {
    const relevantInvoices = clinicId ? invoices.filter(i => i.clinic_id === clinicId) : invoices;
    return {
      total: relevantInvoices.length,
      authorized: relevantInvoices.filter(i => i.status === 'authorized').length,
      pending: relevantInvoices.filter(i => i.status === 'pending').length,
      processing: relevantInvoices.filter(i => i.status === 'processing').length,
      cancelled: relevantInvoices.filter(i => i.status === 'cancelled').length,
      totalValue: relevantInvoices.filter(i => i.status === 'authorized').reduce((s, i) => s + i.value, 0),
    };
  }, [invoices, clinicId]);

  const nextNumber = useMemo(() => {
    const relevantInvoices = clinicId ? invoices.filter(i => i.clinic_id === clinicId) : invoices;
    const maxNum = relevantInvoices.reduce((max, i) => Math.max(max, parseInt(i.number) || 0), 0);
    return String(maxNum + 1).padStart(3, '0');
  }, [invoices, clinicId]);

  const openNew = () => {
    setEditing(null);
    setForm({ number: nextNumber, serie: '1', customer_name: '', customer_doc: '', issue_date: new Date().toISOString().split('T')[0] });
    setItensForm([{ codigo: '001', descricao: '', ncm: '96190000', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 0, valorTotal: 0 }]);
    setShowModal(true);
  };

  const openEdit = (nfe: Invoice) => {
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
    if (!form.customer_name?.trim()) { toast('Cliente é obrigatório.', 'error'); return; }
    if (!form.customer_doc?.trim()) { toast('CPF/CNPJ é obrigatório.', 'error'); return; }

    const itensValidos = itensForm.filter(i => i.descricao && i.valorTotal > 0);
    if (itensValidos.length === 0) { toast('Adicione pelo menos um item válido.', 'error'); return; }

    setEmitindo(true);

    const isCnpj = form.customer_doc.replace(/\D/g, '').length > 11;
    const destinatario: NFeDestinatario = isCnpj
      ? { cnpj: form.customer_doc, razaoSocial: form.customer_name }
      : { cpf: form.customer_doc, razaoSocial: form.customer_name };

    const emissao: NFeEmissao = {
      numero: form.number!,
      serie: form.serie!,
      naturezaOperacao: 'Venda de serviços',
      destinatario,
      itens: itensValidos,
      observacoes: form.customer_name,
    };

    const config = loadNFeConfig();

    if (!config || config.environment === 'homologacao') {
      addInvoice({
        reference: `demo-${Date.now()}`,
        number: form.number || nextNumber,
        serie: form.serie || '1',
        access_key: Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join(''),
        customer_name: form.customer_name!,
        customer_doc: form.customer_doc!,
        value: itensValidos.reduce((s, i) => s + i.valorTotal, 0),
        status: 'authorized',
        issue_date: form.issue_date || new Date().toISOString().split('T')[0],
        protocol: Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join(''),
        clinic_id: clinicId || '',
      });
      toast('NFe emitida com sucesso! (Modo homologação)', 'success');
      setShowModal(false);
      setEmitindo(false);
      return;
    }

    const result = await emitirNFe(emissao);

    if (result.sucesso) {
      addInvoice({
        reference: result.referencia,
        number: result.numero || form.number || nextNumber,
        serie: result.serie || form.serie || '1',
        access_key: result.chave || '',
        customer_name: form.customer_name!,
        customer_doc: form.customer_doc!,
        value: itensValidos.reduce((s, i) => s + i.valorTotal, 0),
        status: 'authorized',
        issue_date: form.issue_date || new Date().toISOString().split('T')[0],
        protocol: result.protocolo || result.codigoAutorizacao || '',
        xml_url: result.xmlUrl,
        pdf_url: result.pdfUrl,
        clinic_id: clinicId || '',
      });
      toast('NFe autorizada pela SEFAZ!', 'success');
      setShowModal(false);
    } else if (result.status === 'processando') {
      addInvoice({
        reference: result.referencia,
        number: form.number || nextNumber,
        serie: form.serie || '1',
        access_key: '',
        customer_name: form.customer_name!,
        customer_doc: form.customer_doc!,
        value: itensValidos.reduce((s, i) => s + i.valorTotal, 0),
        status: 'processing',
        issue_date: form.issue_date || new Date().toISOString().split('T')[0],
        clinic_id: clinicId || '',
      });
      toast('NFe em processamento. Consulte em alguns segundos.', 'info');
      setShowModal(false);
    } else {
      toast(`Erro: ${result.mensagem || 'Falha na emissão'}`, 'error');
    }
    setEmitindo(false);
  };

  const handleConsultar = async (nfe: Invoice) => {
    if (!nfe.reference) return;
    const result = await consultarNFe(nfe.reference);
    if (result.sucesso) {
      updateInvoice(nfe.id, {
        status: 'authorized',
        access_key: result.chave || nfe.access_key,
        protocol: result.protocolo || result.codigoAutorizacao || nfe.protocol,
        xml_url: result.xmlUrl || nfe.xml_url,
        pdf_url: result.pdfUrl || nfe.pdf_url,
      });
      toast('NFe atualizada!', 'success');
    } else {
      toast(`Status: ${result.status} - ${result.mensagem || ''}`, 'info');
    }
  };

  const handleCancelar = async (nfe: Invoice) => {
    if (!nfe.reference && !nfe.access_key) {
      updateInvoice(nfe.id, { status: 'cancelled' });
      toast('NFe cancelada.', 'success');
      return;
    }
    const justificativa = 'Cancelamento solicitado pelo emitente';
    const result = await cancelarNFe(nfe.reference || nfe.access_key, justificativa);
    if (result.sucesso) {
      updateInvoice(nfe.id, { status: 'cancelled' });
      toast('NFe cancelada junto à SEFAZ.', 'success');
    } else {
      toast(`Erro ao cancelar: ${result.mensagem}`, 'error');
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteInvoice(deleteId);
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
                  {inv.access_key ? (
                    <span className="font-mono text-xs text-slate-500">{inv.access_key.slice(0, 10)}...{inv.access_key.slice(-6)}</span>
                  ) : <span className="text-xs text-slate-400">-</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{inv.customer_name}</div>
                  <div className="text-xs text-slate-400">{inv.customer_doc}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(inv.value)}</td>
                <td className="px-4 py-3 text-slate-600">{inv.issue_date.split('-').reverse().join('/')}</td>
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
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Ver DANFE">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {inv.xml_url && (
                      <a href={inv.xml_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Baixar XML">
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
            <input type="text" value={form.customer_name || ''} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm" placeholder="Nome ou Razão Social" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">CPF ou CNPJ *</label>
            <input type="text" value={form.customer_doc || ''} onChange={e => setForm(f => ({ ...f, customer_doc: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm" placeholder="000.000.000-00 ou 00.000.000/0000-00" />
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
