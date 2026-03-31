import React, { useState, useMemo } from 'react';
import {
  Building2, Plus, Search, Edit3, Trash2, Save, MapPin, Phone, Mail, Users
} from 'lucide-react';
import { cn, uid } from '@/lib/utils';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useShared';
import { Modal, ConfirmDialog, EmptyState } from '@/components/shared';
import type { Branch } from '@/types';

interface BranchPanelProps {
  clinicId?: string;
}

export function BranchPanel({ clinicId }: BranchPanelProps) {
  const branches = useClinicStore(s => s.branches);
  const addBranch = useClinicStore(s => s.addBranch);
  const updateBranch = useClinicStore(s => s.updateBranch);
  const deleteBranch = useClinicStore(s => s.deleteBranch);
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Branch>>({});

  const filtered = useMemo(() => {
    return branches.filter(b => {
      if (!showInactive && !b.is_active) return false;
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.address.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [branches, search, showInactive]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', address: '', phone: '', email: '', responsible_name: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({ ...branch });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name?.trim()) { toast('Nome da filial é obrigatório.', 'error'); return; }
    if (!form.address?.trim()) { toast('Endereço é obrigatório.', 'error'); return; }

    const data = {
      clinic_id: clinicId || user?.clinic_id || 'clinic-1',
      name: form.name!,
      address: form.address!,
      phone: form.phone || '',
      email: form.email || '',
      responsible_name: form.responsible_name || '',
      is_active: form.is_active ?? true,
    };

    if (editing) {
      updateBranch(editing.id, data);
      toast('Filial atualizada!', 'success');
    } else {
      addBranch(data);
      toast('Filial cadastrada!', 'success');
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBranch(deleteId);
      toast('Filial removida.', 'success');
      setDeleteId(null);
    }
  };

  const toggleActive = (id: string, current: boolean) => {
    updateBranch(id, { is_active: !current });
    toast('Status atualizado.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-600" />
            Filiais
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie as unidades e filiais da clínica</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" /> Nova Filial
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou endereço..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-slate-300" />
          Mostrar inativas
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(branch => (
          <div key={branch.id} className={cn("bg-white rounded-2xl border p-5 transition-all hover:shadow-md", branch.is_active ? "border-slate-100" : "border-red-100 bg-red-50/30")}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", branch.is_active ? "bg-cyan-50 text-cyan-600" : "bg-red-50 text-red-500")}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-1", branch.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {branch.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(branch.id, branch.is_active)} className={cn("p-1.5 rounded-lg transition-colors text-xs font-medium", branch.is_active ? "text-emerald-600 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50")}>{branch.is_active ? 'Desativar' : 'Ativar'}</button>
                <button onClick={() => openEdit(branch)} className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteId(branch.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /><span>{branch.address}</span></div>
              {branch.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-400 shrink-0" /><span>{branch.phone}</span></div>}
              {branch.email && <div className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{branch.email}</span></div>}
              {branch.responsible_name && <div className="flex items-center gap-2 text-slate-600"><Users className="w-4 h-4 text-slate-400 shrink-0" /><span>Resp: {branch.responsible_name}</span></div>}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Building2} title="Nenhuma filial encontrada" description={search ? 'Tente ajustar sua busca.' : 'Cadastre sua primeira filial.'} />}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Filial' : 'Nova Filial'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Filial *</label><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm" placeholder="Ex: Filial Pinheiros" /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Endereço *</label><input type="text" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm" placeholder="Rua, número - Cidade/UF" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label><input type="text" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm" placeholder="(11) 0000-0000" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Email</label><input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm" placeholder="filial@clinica.com.br" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Responsável</label><input type="text" value={form.responsible_name || ''} onChange={e => setForm(f => ({ ...f, responsible_name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm" placeholder="Nome do responsável" /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-slate-300" />Filial ativa</label>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors text-sm font-medium"><Save className="w-4 h-4" /> {editing ? 'Salvar' : 'Cadastrar'}</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remover Filial" message="Tem certeza que deseja remover esta filial?" confirmLabel="Remover" variant="danger" />
    </div>
  );
}
