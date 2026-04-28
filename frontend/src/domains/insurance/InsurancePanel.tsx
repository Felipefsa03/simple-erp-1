import React, { useState, useMemo } from 'react';
import {
  Shield, Plus, Search, Edit3, Trash2, Save, MapPin, Phone, Mail, Building2, AlertCircle
} from 'lucide-react';
import { cn, uid } from '@/lib/utils';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useShared';
import { Modal, ConfirmDialog, EmptyState } from '@/components/shared';
import type { Insurance } from '@/types';

interface InsurancePanelProps {
  clinicId?: string;
}

export function InsurancePanel({ clinicId }: InsurancePanelProps) {
  const insurances = useClinicStore(s => s.insurances);
  const addInsurance = useClinicStore(s => s.addInsurance);
  const updateInsurance = useClinicStore(s => s.updateInsurance);
  const deleteInsurance = useClinicStore(s => s.deleteInsurance);
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Insurance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Insurance>>({});

  const filtered = useMemo(() => {
    return insurances.filter(i => {
      if (!showInactive && !i.is_active) return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [insurances, search, showInactive]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', code: '', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (ins: Insurance) => {
    setEditing(ins);
    setForm({ ...ins });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name?.trim()) { toast('Nome é obrigatório.', 'error'); return; }
    if (!form.code?.trim()) { toast('Código é obrigatório.', 'error'); return; }

    const data = {
      clinic_id: clinicId || user?.clinic_id || 'clinic-1',
      name: form.name!,
      code: form.code!,
      contact_phone: form.contact_phone || '',
      contact_email: form.contact_email || '',
      address: form.address || '',
      notes: form.notes || '',
      is_active: form.is_active ?? true,
    };

    if (editing) {
      updateInsurance(editing.id, data);
      toast('Convênio atualizado!', 'success');
    } else {
      addInsurance(data);
      toast('Convênio cadastrado!', 'success');
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteInsurance(deleteId);
      toast('Convênio removido.', 'success');
      setDeleteId(null);
    }
  };

  const toggleActive = (id: string, current: boolean) => {
    updateInsurance(id, { is_active: !current });
    toast('Status atualizado.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-600" />
            Convênios
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os convênios e planos de saúde aceitos</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" /> Novo Convênio
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou código..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-slate-300" />
          Mostrar inativos
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(ins => (
              <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{ins.name}</div>
                  {ins.address && <div className="text-xs text-slate-400 mt-0.5">{ins.address}</div>}
                </td>
                <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-semibold">{ins.code}</span></td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-600">{ins.contact_phone}</div>
                  <div className="text-xs text-slate-400">{ins.contact_email}</div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(ins.id, ins.is_active)} className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors", ins.is_active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-700 hover:bg-red-100")}>
                    {ins.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(ins)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(ins.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center"><EmptyState icon={Shield} title="Nenhum convênio encontrado" description={search ? 'Tente ajustar sua busca.' : 'Cadastre seu primeiro convênio.'} /></div>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Convênio' : 'Novo Convênio'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nome *</label><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Ex: Unimed" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Código *</label><input type="text" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Ex: UNI" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label><input type="text" value={form.contact_phone || ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="(11) 3000-0000" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Email</label><input type="email" value={form.contact_email || ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="contato@convenio.com.br" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Endereço</label><input type="text" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Rua, número - Cidade/UF" /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm resize-none" placeholder="Informações adicionais..." /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-slate-300" />Convênio ativo</label>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-sm font-medium"><Save className="w-4 h-4" /> {editing ? 'Salvar' : 'Cadastrar'}</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remover Convênio" message="Tem certeza que deseja remover este convênio?" confirmLabel="Remover" variant="danger" />
    </div>
  );
}
