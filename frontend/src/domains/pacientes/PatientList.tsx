import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Search, Plus, Filter, MoreHorizontal, Phone, Mail, Calendar as CalendarIcon, X, Upload, Eye, FileText, Trash2, AlertCircle, Pencil, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce, toast, formatDateBR, useSubmitOnce } from '@/hooks/useShared';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Modal, EmptyState, ConfirmDialog, LoadingButton } from '@/components/shared';
import type { Patient } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PacienteSchema, type PacienteFormData } from './paciente.schema';

// Formatar telefone para padrão brasileiro com +55
// Formatos aceitos: 11999999999, 5511999999999, +5511999999999
// Sempre retorna no formato: 55 + DDD + 9 +Numero (13 dígitos)
function formatPhoneBrazilian(phone: string): string {
  if (!phone) return '';
  
  // Remove tudo que não é número (incluindo +)
  let digits = phone.replace(/\D/g, '');
  
  // Remove zeros à esquerda se houver
  digits = digits.replace(/^0+/, '');
  
  // Se tem 13 dígitos e começa com 55, verificar se está correto
  if (digits.length === 13 && digits.startsWith('55')) {
    // Verifica se o 9 está na posição correta (após o DDD)
    const ddd = digits.slice(2, 4);
    const afterDdd = digits.slice(4);
    // Se o primeiro dígito após DDD não é 9, pode precisar inserir
    if (!afterDdd.startsWith('9')) {
      // Insere o 9 após o DDD
      return '55' + ddd + '9' + afterDdd.slice(1);
    }
    return digits;
  }
  
  // Se tem 12 dígitos e começa com 55, precisa inserir o 9
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    return '55' + ddd + '9' + number;
  }
  
  // Se tem 11 dígitos (DDD + 9 + 8 números), adiciona 55
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const afterDdd = digits.slice(2);
    // Se já tem 9 no início, só adiciona 55
    if (afterDdd.startsWith('9')) {
      return '55' + digits;
    }
    // Se não tem 9, insere após o DDD
    return '55' + ddd + '9' + afterDdd.slice(1);
  }
  
  // Se tem 10 dígitos (DDD + 8 números sem 9), adiciona 55 e insere o 9
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    return '55' + ddd + '9' + number;
  }
  
  // Para outros casos, apenas adiciona 55 se não tiver
  if (!digits.startsWith('55')) {
    // Se tem pelo menos 10 dígitos, assume formato brasileiro
    if (digits.length >= 10) {
      return '55' + digits;
    }
    return '55' + digits;
  }
  
  return digits;
}

// Validar se o telefone está no formato correto para WhatsApp
function isValidWhatsAppPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // WhatsApp brasileiro deve ter 13 dígitos: 55 + DDD (2) + 9 + Numero (8)
  return digits.length === 13 && digits.startsWith('55');
}

interface PatientListProps {
  onNavigate?: (tab: string, ctx?: { patientId?: string }) => void;
}

export function PatientList({ onNavigate }: PatientListProps) {
  const { user, hasPermission } = useAuth();
  const { patients, addPatient, importPatients, updatePatient, deletePatient } = useClinicStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; errors: string[] }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const ITEMS_PER_PAGE = 20;

  const canView = hasPermission('view_patients');
  const canManage = hasPermission('manage_patients');
  const canImport = hasPermission('import_patients');
  const clinicId = useAuth(s => s.getClinicId()) || '00000000-0000-0000-0000-000000000001';

  // Zod-validated create patient form
  const { register: regCreate, handleSubmit: handleCreateSubmit, formState: { errors: createErrors }, reset: resetCreateForm } = useForm<PacienteFormData>({
    resolver: zodResolver(PacienteSchema),
    defaultValues: { name: '', phone: '', email: '', cpf: '', birth_date: '', tags: '', allergies: '' },
  });

  // Zod-validated edit patient form
  const { register: regEdit, handleSubmit: handleEditSubmit, formState: { errors: editErrors }, reset: resetEditForm } = useForm<PacienteFormData>({
    resolver: zodResolver(PacienteSchema),
    defaultValues: { name: '', phone: '', email: '', cpf: '', birth_date: '', tags: '', allergies: '' },
  });

  const handleExportCSV = () => {
    const headers = ['NOME', 'TELEFONE', 'EMAIL', 'CPF', 'NASCIMENTO', 'ALERGIAS', 'STATUS', 'ULTIMA_VISITA'];
    const rows = filteredPatients.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.phone || '',
      p.email || '',
      p.cpf || '',
      p.birth_date || '',
      `"${(p.allergies || []).join(', ').replace(/"/g, '""')}"`,
      p.status === 'active' ? 'Ativo' : 'Inativo',
      p.last_visit || '',
    ].join(';'));
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${filteredPatients.length} pacientes exportados!`);
  };

  const normalizeHeader = (header: string) => header.toLowerCase().trim();

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;
    const cleaned = text.replace(/^\uFEFF/, '');

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"') {
        const next = cleaned[i + 1];
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
        continue;
      }
      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && cleaned[i + 1] === '\n') i++;
        row.push(current);
        if (row.some(cell => cell.trim())) rows.push(row);
        row = [];
        current = '';
        continue;
      }
      current += char;
    }
    if (current.length || row.length) {
      row.push(current);
      if (row.some(cell => cell.trim())) rows.push(row);
    }
    return rows;
  };

  const mapImportRows = (rows: Record<string, string>[]) => {
    return rows.map(row => ({
      name: row.nome || row.name || '',
      phone: formatPhoneBrazilian(row.telefone || row.phone || ''), // Formatar com +55 automaticamente
      email: row.email || '',
      cpf: row.cpf || '',
      birth_date: row.nascimento || row.birth_date || '',
      tags: row.tags || '',
      allergies: row.alergias || row.allergies || '',
    }));
  };

  const validateImportRows = (rows: ReturnType<typeof mapImportRows>) => {
    const errors: { row: number; errors: string[] }[] = [];
    rows.forEach((row, index) => {
      const rowErrors: string[] = [];
      if (!row.name) rowErrors.push('Nome');
      if (!row.phone) rowErrors.push('Telefone');
      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors });
      }
    });
    return errors;
  };

  if (!canView) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Você não tem permissão para visualizar pacientes."
      />
    );
  }

  const filteredPatients = useMemo(() => {
    let result = (patients || []).filter(p => p.clinic_id === clinicId);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.cpf?.includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    return result;
  }, [patients, debouncedSearch, statusFilter, user]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPatients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const errorRowSet = useMemo(() => new Set(importErrors.map(e => e.row)), [importErrors]);

  const { submit: handleAddPatientInner, loading: addPatientLoading } = useSubmitOnce(async (data: PacienteFormData) => {
    if (!canManage) { toast('Você não tem permissão para cadastrar pacientes.', 'error'); return; }
    
    // Formatar telefone automaticamente com +55
    const formattedPhone = formatPhoneBrazilian(data.phone);
    
    addPatient({
      clinic_id: clinicId,
      name: data.name,
      phone: formattedPhone,
      email: data.email,
      cpf: data.cpf || undefined,
      birth_date: data.birth_date || undefined,
      allergies: data.allergies ? data.allergies.split(',').map(a => a.trim()) : [],
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: 'active',
    });
    setIsModalOpen(false);
    resetCreateForm();
    toast('Paciente cadastrado com sucesso!');
  });

  const handleAddPatient = handleCreateSubmit((data) => handleAddPatientInner(data));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (!canImport) {
        toast('Você não tem permissão para importar pacientes.', 'error');
        return;
      }
      let data: Record<string, string>[] = [];
      if (ext === 'csv') {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length === 0) {
          toast('Arquivo CSV vazio.', 'warning');
          return;
        }
        const headers = rows.shift()!.map(h => normalizeHeader(h));
        data = rows.map(row => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => { obj[h] = (row[i] || '').trim(); });
          return obj;
        });
      } else if (ext === 'xlsx') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        data = raw.map(row => {
          const obj: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            obj[normalizeHeader(key)] = String(value ?? '').trim();
          });
          return obj;
        });
      } else {
        toast('Use um arquivo CSV ou XLSX para importação.', 'warning');
        return;
      }

      const mapped = mapImportRows(data).filter(row => row.name || row.email || row.phone);
      const errors = validateImportRows(mapped);
      setImportData(mapped);
      setImportErrors(errors);
      setShowImportPreview(true);
    } catch (err) {
      toast('Erro ao ler arquivo. Verifique o formato.', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const { execute: handleConfirmImport, isLoading: importLoading } = useAsyncAction(
    async () => {
      if (importErrors.length > 0) {
        throw new Error('Corrija os erros antes de confirmar a importação.');
      }
      const existingEmails = new Set(
        (patients || []).filter(p => p.clinic_id === clinicId).map(p => p.email.toLowerCase())
      );
      const existingCpfs = new Set(
        (patients || []).filter(p => p.clinic_id === clinicId).map(p => p.cpf || '')
      );
      let duplicates = 0;

      const newPatients = importData.map(row => ({
        clinic_id: clinicId,
        name: row.name || '',
        phone: row.phone || '',
        email: row.email || '',
        cpf: row.cpf || undefined,
        birth_date: row.birth_date || undefined,
        allergies: row.allergies ? row.allergies.split(',').map((a: string) => a.trim()).filter(Boolean) : [],
        tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        status: 'active' as const,
      })).filter(p => {
        const emailKey = p.email.toLowerCase();
        const cpfKey = p.cpf || '';
        if (emailKey && existingEmails.has(emailKey)) { duplicates += 1; return false; }
        if (cpfKey && existingCpfs.has(cpfKey)) { duplicates += 1; return false; }
        if (emailKey) existingEmails.add(emailKey);
        if (cpfKey) existingCpfs.add(cpfKey);
        return !!p.name;
      });

      const count = importPatients(newPatients);
      setShowImportPreview(false);
      setImportData([]);
      setImportErrors([]);
      return { count, duplicates };
    },
    {
      onSuccess: (result) => {
        if (result) toast(`${result.count} pacientes importados com sucesso!${result.duplicates ? ` (${result.duplicates} duplicados ignorados)` : ''}`);
      },
    }
  );

  // Edit patient handler
  const { submit: handleEditPatientInner, loading: editPatientLoading } = useSubmitOnce(async (data: PacienteFormData) => {
    if (!editingPatient || !canManage) return;
    const formattedPhone = formatPhoneBrazilian(data.phone);
    updatePatient(editingPatient.id, {
      name: data.name,
      phone: formattedPhone,
      email: data.email,
      cpf: data.cpf || undefined,
      birth_date: data.birth_date || undefined,
      allergies: data.allergies ? data.allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setEditingPatient(null);
    toast('Paciente atualizado com sucesso!');
  });

  const handleEditPatient = handleEditSubmit((data) => handleEditPatientInner(data));

  const { submit: handleDeletePatient, loading: deletePatientLoading } = useSubmitOnce(async () => {
    if (!deleteConfirm || !canManage) return;
    deletePatient(deleteConfirm.id);
    setDeleteConfirm(null);
    toast('Paciente excluído com sucesso!');
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-slate-500">Gerencie sua base de {filteredPatients.length} pacientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200 transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!canManage}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all shadow-sm shadow-cyan-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </button>
        </div>
      </header>

      {/* New Patient Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Paciente">
        <form onSubmit={handleAddPatient} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo *</label>
            <input {...regCreate('name')} className={cn("w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none", createErrors.name ? 'border-red-300' : 'border-transparent')} placeholder="Ex: Maria Silva" />
            {createErrors.name && <span className="text-xs text-red-500 font-medium">{createErrors.name.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone *</label>
              <input {...regCreate('phone')} className={cn("w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none", createErrors.phone ? 'border-red-300' : 'border-transparent')} placeholder="(11) 99999-9999" />
              {createErrors.phone && <span className="text-xs text-red-500 font-medium">{createErrors.phone.message}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF</label>
              <input {...regCreate('cpf')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="000.000.000-00" />
              {createErrors.cpf && <span className="text-xs text-red-500 font-medium">{createErrors.cpf.message}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email *</label>
              <input {...regCreate('email')} className={cn("w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none", createErrors.email ? 'border-red-300' : 'border-transparent')} placeholder="maria@email.com" />
              {createErrors.email && <span className="text-xs text-red-500 font-medium">{createErrors.email.message}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nascimento</label>
              <input type="date" {...regCreate('birth_date')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tags (separadas por vírgula)</label>
            <input {...regCreate('tags')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="Ex: Ortodontia, Premium" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alergias (separadas por vírgula)</label>
            <input {...regCreate('allergies')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="Ex: Penicilina, Látex" />
          </div>
          <LoadingButton type="submit" loading={addPatientLoading} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4">Cadastrar Paciente</LoadingButton>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Ou</span></div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canImport}
            className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Cadastro em Massa (CSV/XLSX)
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleFileUpload} />
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal isOpen={!!editingPatient} onClose={() => setEditingPatient(null)} title="Editar Paciente">
        <form onSubmit={handleEditPatient} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo *</label>
            <input {...regEdit('name')} className={cn("w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none", editErrors.name ? 'border-red-300' : 'border-transparent')} placeholder="Ex: Maria Silva" />
            {editErrors.name && <span className="text-xs text-red-500 font-medium">{editErrors.name.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone *</label>
              <input {...regEdit('phone')} className={cn("w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none", editErrors.phone ? 'border-red-300' : 'border-transparent')} placeholder="(11) 99999-9999" />
              {editErrors.phone && <span className="text-xs text-red-500 font-medium">{editErrors.phone.message}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF</label>
              <input {...regEdit('cpf')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="000.000.000-00" />
              {editErrors.cpf && <span className="text-xs text-red-500 font-medium">{editErrors.cpf.message}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email *</label>
              <input {...regEdit('email')} className={cn("w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none", editErrors.email ? 'border-red-300' : 'border-transparent')} placeholder="maria@email.com" />
              {editErrors.email && <span className="text-xs text-red-500 font-medium">{editErrors.email.message}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nascimento</label>
              <input type="date" {...regEdit('birth_date')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tags (separadas por vírgula)</label>
            <input {...regEdit('tags')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="Ex: Ortodontia, Premium" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alergias (separadas por vírgula)</label>
            <input {...regEdit('allergies')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="Ex: Penicilina, Látex" />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={() => setEditingPatient(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
            <LoadingButton type="submit" loading={editPatientLoading} className="flex-1 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200">Salvar Alterações</LoadingButton>
          </div>
        </form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal isOpen={showImportPreview} onClose={() => { setShowImportPreview(false); setImportData([]); setImportErrors([]); }} title={`Preview de Importação (${importData.length} registros)`} maxWidth="max-w-2xl">
        <div className="space-y-4">
          {importErrors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              {importErrors.length} linha(s) com erro. Corrija os campos obrigatórios (Nome, Telefone, Email) antes de importar.
            </div>
          )}
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {['name', 'phone', 'email', 'cpf', 'birth_date'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {importData.slice(0, 10).map((row, i) => (
                  <tr key={i} className={errorRowSet.has(i + 2) ? 'bg-amber-50/60' : ''}>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.phone}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.email}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.cpf}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.birth_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importData.length > 10 && <p className="text-xs text-slate-400">Mostrando 10 de {importData.length} registros</p>}
          <div className="flex gap-3">
            <button onClick={() => { setShowImportPreview(false); setImportData([]); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
            <LoadingButton
              onClick={handleConfirmImport}
              loading={importLoading}
              disabled={importErrors.length > 0}
              className="flex-1 py-2.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {importLoading ? 'Importando...' : 'Confirmar Importação'}
            </LoadingButton>
          </div>
        </div>
      </Modal>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'risk'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === s ? "bg-cyan-50 text-cyan-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : s === 'risk' ? 'Risco' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title={searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
          description={searchQuery ? "Tente buscar por outro termo." : "Cadastre seu primeiro paciente para começar."}
          action={!searchQuery && canManage ? { label: 'Cadastrar Paciente', onClick: () => setIsModalOpen(true) } : undefined}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente</th>
                  <th className="hidden md:table-cell px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contato</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Última Visita</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPatients.map((patient, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    key={patient.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{patient.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(patient.tags || []).map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">{tag}</span>
                            ))}
                          </div>
                          <div className="md:hidden mt-1 text-[10px] text-slate-400">{patient.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="w-3 h-3" />{patient.phone}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><Mail className="w-3 h-3" />{patient.email}</div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        {patient.last_visit ? formatDateBR(patient.last_visit) : 'Nunca'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        patient.status === 'active' ? "bg-cyan-50 text-cyan-700" :
                          patient.status === 'risk' ? "bg-amber-50 text-amber-700" :
                            "bg-slate-100 text-slate-700"
                      )}>
                        {patient.status === 'active' ? 'Ativo' : patient.status === 'risk' ? 'Risco Churn' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingPatient(patient);
                            resetEditForm({
                              name: patient.name,
                              phone: patient.phone,
                              email: patient.email,
                              cpf: patient.cpf || '',
                              birth_date: patient.birth_date || '',
                              tags: (patient.tags || []).join(', '),
                              allergies: (patient.allergies || []).join(', '),
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Editar paciente"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onNavigate?.('prontuarios', { patientId: patient.id })}
                          className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                          title="Ver prontuário"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                        onClick={() => onNavigate?.('agenda', { patientId: patient.id })}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Ver agenda"
                      >
                        <CalendarIcon className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => setDeleteConfirm(patient)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir paciente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">{filteredPatients.length} pacientes • Página {currentPage} de {totalPages}</p>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === page ? "bg-cyan-600 text-white" : "text-slate-400 hover:bg-slate-50"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Excluir Paciente"
        message={`Tem certeza que deseja excluir o paciente ${deleteConfirm?.name}? Esta ação não pode ser desfeita.`}
        confirmLabel={deletePatientLoading ? "Excluindo..." : "Excluir"}
        onConfirm={handleDeletePatient}
        onClose={() => setDeleteConfirm(null)}
        variant="danger"
      />
    </div>
  );
}
