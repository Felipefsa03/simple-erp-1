import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Mic, Camera, FileText, History, Plus, Save, User, Activity, ClipboardList, Image as ImageIcon, X, Lock, ChevronLeft, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency, useSubmitOnce } from '@/hooks/useShared';
import { Modal, EmptyState, ConfirmDialog, LoadingButton } from '@/components/shared';
import type { OdontogramEntry, TreatmentPlanItem, AppointmentMaterial } from '@/types';

const tabs = [
  { id: 'evolucao', label: 'Evolução', icon: History },
  { id: 'odontograma', label: 'Odontograma', icon: Activity },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { id: 'estoque', label: 'Uso de Estoque', icon: Plus },
  { id: 'fotos', label: 'Fotos', icon: ImageIcon },
  { id: 'plano', label: 'Plano de Tratamento', icon: FileText },
];

// FDI Tooth Numbering System
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

interface ProntuarioProps {
  onNavigate?: (tab: string, ctx?: any) => void;
}

export function Prontuario({ onNavigate }: ProntuarioProps) {
  const { user, hasPermission } = useAuth();
  const store = useClinicStore();
  const {
    navigationContext,
    patients,
    appointments,
    services,
    stockItems,
    getPatient,
    getRecordsForPatient,
    saveEvolution,
    getOdontogramData,
    setOdontogramEntry,
    saveAnamnese,
    getAnamnese,
    getPlansForPatient,
    addTreatmentPlan,
    finalizeAppointment,
    getAppointmentMaterials,
    setAppointmentMaterials,
    patientPhotos,
    addPatientPhoto,
    removePatientPhoto,
  } = store;

  const clinicId = user?.clinic_id || 'clinic-1';
  const clinicPatients = useMemo(() => patients.filter(p => p.clinic_id === clinicId), [patients, clinicId]);
  const clinicAppointments = useMemo(() => appointments.filter(a => a.clinic_id === clinicId), [appointments, clinicId]);
  const clinicServices = useMemo(() => services.filter(s => s.clinic_id === clinicId), [services, clinicId]);
  const clinicStockItems = useMemo(() => stockItems.filter(s => s.clinic_id === clinicId), [stockItems, clinicId]);

  const patientId = navigationContext.patientId || clinicPatients[0]?.id;
  const appointmentId = navigationContext.appointmentId;
  const patient = getPatient(patientId);
  const appointment = appointmentId ? clinicAppointments.find(a => a.id === appointmentId) : undefined;
  const isLocked = appointment?.status === 'done';
  const canEdit = hasPermission('edit_record');
  const canFinalize = hasPermission('finalize_appointment');

  const [activeSubTab, setActiveSubTab] = useState('evolucao');
  const [evolutionText, setEvolutionText] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [toothModal, setToothModal] = useState<number | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Anamnese state
  const [anamneseForm, setAnamneseForm] = useState({ medical_history: '', current_medications: '', allergies: '', habits: '', complaints: '', observations: '' });

  // Stock consumption state
  const [consumptionItems, setConsumptionItems] = useState<AppointmentMaterial[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState('');

  // Treatment plan state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanItems, setNewPlanItems] = useState<TreatmentPlanItem[]>([]);

  const patientRecords = useMemo(() => patientId ? getRecordsForPatient(patientId) : [], [patientId, store.medicalRecords]);
  const odontogramData = useMemo(() => patientId ? getOdontogramData(patientId) : [], [patientId, store.odontogramData]);
  const treatmentPlans = useMemo(() => patientId ? getPlansForPatient(patientId) : [], [patientId, store.treatmentPlans]);
  const photos = useMemo(() => patientId ? (patientPhotos[patientId] || []) : [], [patientId, patientPhotos]);

  // Load anamnese data
  useEffect(() => {
    if (patientId) {
      const data = getAnamnese(patientId);
      if (data) setAnamneseForm(data);
    }
  }, [patientId]);

  // Auto-populate stock consumption from service materials
  useEffect(() => {
    if (!appointmentId) return;
    const stored = getAppointmentMaterials(appointmentId);
    if (stored.length > 0) {
      setConsumptionItems(stored);
      return;
    }
    if (appointment?.service_id) {
      const service = clinicServices.find(s => s.id === appointment.service_id);
      if (service?.materials) {
        setConsumptionItems(service.materials.map(m => ({
          stock_item_id: m.stock_item_id,
          stock_item_name: m.stock_item_name,
          qty: m.qty_per_use,
        })));
      }
    }
  }, [appointmentId, appointment?.service_id, clinicServices, getAppointmentMaterials]);

  useEffect(() => {
    if (!appointmentId) return;
    setAppointmentMaterials(appointmentId, consumptionItems);
  }, [appointmentId, consumptionItems, setAppointmentMaterials]);

  const getToothStatus = (toothNum: number): OdontogramEntry | undefined => odontogramData.find(e => e.tooth_number === toothNum);

  const getToothColor = (toothNum: number) => {
    const entry = getToothStatus(toothNum);
    if (!entry) return 'bg-white border-slate-300';
    switch (entry.procedure) {
      case 'Cárie': return 'bg-red-500 border-red-600';
      case 'Restauração': return 'bg-blue-500 border-blue-600';
      case 'Canal': return 'bg-amber-500 border-amber-600';
      case 'Extraído': return 'bg-slate-800 border-slate-900';
      case 'Implante': return 'bg-purple-500 border-purple-600';
      case 'Pendente': return 'bg-amber-300 border-amber-400';
      case 'Saudável': return 'bg-emerald-500 border-emerald-600';
      default: return 'bg-white border-slate-300';
    }
  };

  const { submit: handleFinish, loading: finishLoading } = useSubmitOnce(async () => {
    if (!appointmentId || !user) return;
    if (!canFinalize) {
      toast('Você não tem permissão para finalizar atendimentos.', 'error');
      return;
    }
    await new Promise(r => setTimeout(r, 500));
    const ok = finalizeAppointment(appointmentId, user.id, user.name);
    if (!ok) {
      toast('Inicie o atendimento antes de finalizar.', 'warning');
      return;
    }
    toast('Atendimento finalizado! Prontuário bloqueado. Redirecionando para o Financeiro...');
    store.setNavigationContext({ appointmentId, fromModule: 'prontuarios' });
    setTimeout(() => onNavigate?.('financeiro', { appointmentId }), 1500);
  });

  const handleSaveEvolution = () => {
    if (!patientId || !user) return;
    if (!canEdit) { toast('Você não tem permissão para editar o prontuário.', 'error'); return; }
    saveEvolution(appointmentId || undefined, patientId, user.clinic_id || 'clinic-1', user.id, evolutionText);
    toast('Evolução salva com sucesso!');
    setEvolutionText('');
  };

  const handleSaveAnamnese = () => {
    if (!patientId) return;
    if (!canEdit) { toast('Você não tem permissão para editar o prontuário.', 'error'); return; }
    saveAnamnese({ ...anamneseForm, patient_id: patientId, clinic_id: user?.clinic_id || 'clinic-1', updated_at: new Date().toISOString() });
    toast('Anamnese salva com sucesso!');
  };

  const handleToothClick = (toothNum: number) => {
    if (isLocked) { toast('Prontuário bloqueado após finalização', 'warning'); return; }
    if (!canEdit) { toast('Você não tem permissão para editar o odontograma.', 'error'); return; }
    setToothModal(toothNum);
  };

  const handleToothProcedure = (procedure: string) => {
    if (toothModal === null || !patientId) return;
    setOdontogramEntry(patientId, { tooth_number: toothModal, procedure, date: new Date().toISOString() });
    toast(`${procedure} registrado no dente ${toothModal}`);
    setToothModal(null);
  };

  const handleAddConsumptionItem = () => {
    if (!selectedStockItem) return;
    const item = clinicStockItems.find(s => s.id === selectedStockItem);
    if (!item) return;
    if (consumptionItems.some(c => c.stock_item_id === item.id)) {
      toast('Item já adicionado', 'warning');
      return;
    }
    setConsumptionItems(prev => [...prev, { stock_item_id: item.id, stock_item_name: item.name, qty: 1 }]);
    setSelectedStockItem('');
    setIsAddingItem(false);
  };

  const handleSavePlan = () => {
    if (!newPlanTitle || newPlanItems.length === 0 || !patientId) return;
    addTreatmentPlan({
      patient_id: patientId,
      clinic_id: user?.clinic_id || 'clinic-1',
      title: newPlanTitle,
      items: newPlanItems,
      status: 'active',
      total_estimated: newPlanItems.reduce((s, i) => s + i.estimated_price, 0),
    });
    setShowPlanModal(false);
    setNewPlanTitle('');
    setNewPlanItems([]);
    toast('Plano de tratamento criado!');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!patientId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        addPatientPhoto(patientId, dataUrl);
        toast('Foto adicionada ao prontuário!');
      }
    };
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  if (!patient) {
    return (
      <EmptyState
        icon={User}
        title="Nenhum paciente selecionado"
        description="Selecione um paciente na lista ou inicie um atendimento pela agenda."
        action={{ label: 'Ir para Pacientes', onClick: () => onNavigate?.('pacientes') }}
      />
    );
  }

  const patientAllergies = patient.allergies || [];
  const patientTags = patient.tags || [];
  const age = patient.birth_date ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / 31557600000) : null;

  return (
    <div className="space-y-6 relative">
      {/* Lock Banner */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-800">Prontuário Bloqueado</p>
            <p className="text-xs text-amber-600">Este atendimento foi finalizado. Edições não são permitidas.</p>
          </div>
        </div>
      )}

      {/* Patient Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            {patient.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            <p className="text-slate-500">
              {patient.cpf && `CPF: ${patient.cpf} • `}
              {age !== null && `${age} anos • `}
              {patient.phone}
            </p>
            {appointment && (
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block",
                appointment.status === 'in_progress' ? "bg-amber-100 text-amber-700" :
                  appointment.status === 'done' ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"
              )}>
                {appointment.service_name} • {appointment.status === 'in_progress' ? 'Em Atendimento' : appointment.status === 'done' ? 'Concluído' : 'Agendado'}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate?.('pacientes')} className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-4 h-4 inline mr-1" />Voltar
          </button>
          {appointment && !isLocked && (
            <LoadingButton
              loading={finishLoading}
              onClick={() => setShowFinishConfirm(true)}
              disabled={!canFinalize}
              className="flex-1 md:flex-none px-4 py-2 bg-cyan-600 rounded-xl text-sm font-medium text-white hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Finalizar Atendimento
            </LoadingButton>
          )}
        </div>
      </header>

      <ConfirmDialog
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        onConfirm={handleFinish}
        title="Finalizar Atendimento?"
        message="Ao finalizar, o prontuário será bloqueado para edição, itens de estoque serão baixados automaticamente e uma cobrança será gerada no financeiro."
        confirmLabel="Finalizar e Gerar Cobrança"
      />

      {/* Tabs */}
      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
            activeSubTab === tab.id ? "bg-cyan-50 text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          )}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Evolution */}
          {activeSubTab === 'evolucao' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Nova Evolução</h2>
              </div>
              <textarea
                value={evolutionText}
                onChange={e => setEvolutionText(e.target.value)}
                disabled={isLocked || !canEdit}
                placeholder="Descreva a evolução do paciente..."
                className="w-full min-h-[250px] p-6 bg-slate-50 border-none rounded-2xl text-slate-700 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none resize-none disabled:opacity-50"
              />
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  {patientRecords.length} evolução(ões) registrada(s)
                </div>
                <button
                  onClick={handleSaveEvolution}
                  disabled={isLocked || !canEdit || !evolutionText.trim()}
                  className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all disabled:opacity-50"
                >
                  Salvar Evolução
                </button>
              </div>
              {/* Previous records */}
              {patientRecords.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-500">Evoluções Anteriores</h3>
                  {patientRecords.map(r => (
                    <div key={r.id} className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.content}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(r.created_at).toLocaleString('pt-BR')} {r.locked && '• 🔒 Bloqueado'}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Odontograma */}
          {activeSubTab === 'odontograma' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-slate-900">Odontograma Digital (FDI)</h2>
                <p className="text-sm text-slate-500">Clique em um dente para registrar procedimentos.</p>
              </div>

              {/* Upper Arch */}
              <div className="flex justify-center gap-1 md:gap-2 mb-2">
                {[...UPPER_RIGHT, ...UPPER_LEFT].map(num => (
                  <div key={num} onClick={() => handleToothClick(num)} className="flex flex-col items-center gap-1 cursor-pointer group">
                    <span className={cn("text-[9px] font-bold", getToothStatus(num) ? "text-cyan-600" : "text-slate-400")}>{num}</span>
                    <div className={cn("w-7 h-9 md:w-9 md:h-11 border-2 rounded-t-xl rounded-b-lg transition-all group-hover:border-cyan-400 group-hover:shadow-md", getToothColor(num))} />
                  </div>
                ))}
              </div>
              <div className="w-full h-px bg-slate-200 my-2" />
              {/* Lower Arch */}
              <div className="flex justify-center gap-1 md:gap-2 mt-2">
                {[...LOWER_LEFT, ...LOWER_RIGHT].map(num => (
                  <div key={num} onClick={() => handleToothClick(num)} className="flex flex-col items-center gap-1 cursor-pointer group">
                    <div className={cn("w-7 h-9 md:w-9 md:h-11 border-2 rounded-b-xl rounded-t-lg transition-all group-hover:border-cyan-400 group-hover:shadow-md", getToothColor(num))} />
                    <span className={cn("text-[9px] font-bold", getToothStatus(num) ? "text-cyan-600" : "text-slate-400")}>{num}</span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-3">
                {['Cárie', 'Restauração', 'Canal', 'Extraído', 'Implante', 'Pendente', 'Saudável'].map(label => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className={cn("w-4 h-4 rounded border", getToothColor(0).includes('white') ? '' :
                      label === 'Cárie' ? 'bg-red-500' : label === 'Restauração' ? 'bg-blue-500' :
                        label === 'Canal' ? 'bg-amber-500' : label === 'Extraído' ? 'bg-slate-800' :
                          label === 'Implante' ? 'bg-purple-500' : label === 'Pendente' ? 'bg-amber-300' : 'bg-emerald-500'
                    )} />
                    <span className="text-slate-600 font-medium">{label}</span>
                  </div>
                ))}
              </div>

              {/* Tooth Modal */}
              <Modal isOpen={toothModal !== null} onClose={() => setToothModal(null)} title={`Dente ${toothModal} — Procedimento`}>
                <div className="space-y-3">
                  {['Cárie', 'Restauração', 'Canal', 'Extraído', 'Implante', 'Pendente', 'Saudável'].map(proc => (
                    <button
                      key={proc}
                      onClick={() => handleToothProcedure(proc)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all"
                    >
                      <div className={cn("w-4 h-4 rounded-full",
                        proc === 'Cárie' ? 'bg-red-500' : proc === 'Restauração' ? 'bg-blue-500' :
                          proc === 'Canal' ? 'bg-amber-500' : proc === 'Extraído' ? 'bg-slate-800' :
                            proc === 'Implante' ? 'bg-purple-500' : proc === 'Pendente' ? 'bg-amber-300' : 'bg-emerald-500'
                      )} />
                      <span className="text-sm font-bold text-slate-700">{proc}</span>
                    </button>
                  ))}
                </div>
              </Modal>
            </motion.div>
          )}

          {/* Anamnese */}
          {activeSubTab === 'anamnese' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Anamnese do Paciente</h2>
              {[
                { key: 'medical_history', label: 'Histórico Médico', placeholder: 'Doenças prévias, cirurgias, internações...' },
                { key: 'current_medications', label: 'Medicamentos em Uso', placeholder: 'Liste os medicamentos atuais...' },
                { key: 'allergies', label: 'Alergias', placeholder: 'Medicamentos, alimentos, materiais...' },
                { key: 'habits', label: 'Hábitos', placeholder: 'Fumante, etilista, bruxismo...' },
                { key: 'complaints', label: 'Queixa Principal', placeholder: 'Motivo da consulta...' },
                { key: 'observations', label: 'Observações', placeholder: 'Informações adicionais...' },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{field.label}</label>
                  <textarea
                    value={(anamneseForm as any)[field.key]}
                    onChange={e => setAnamneseForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    disabled={isLocked || !canEdit}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none resize-none min-h-[60px] disabled:opacity-50"
                  />
                </div>
              ))}
              <button onClick={handleSaveAnamnese} disabled={isLocked || !canEdit} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 disabled:opacity-50">Salvar Anamnese</button>
            </motion.div>
          )}

          {/* Stock Consumption */}
          {activeSubTab === 'estoque' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Consumo de Materiais</h2>
                {!isLocked && canEdit && (
                  <button onClick={() => setIsAddingItem(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700">
                    <Plus className="w-4 h-4" />Adicionar Item
                  </button>
                )}
              </div>
              {isAddingItem && canEdit && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex gap-2">
                  <select value={selectedStockItem} onChange={e => setSelectedStockItem(e.target.value)} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none">
                    <option value="">Selecionar material...</option>
                    {clinicStockItems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.quantity} {s.unit} disp.)</option>)}
                  </select>
                  <button onClick={handleAddConsumptionItem} className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl text-sm">Adicionar</button>
                  <button onClick={() => setIsAddingItem(false)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
              )}
              <div className="space-y-3">
                {consumptionItems.length === 0 ? (
                  <EmptyState title="Nenhum material adicionado" description="Adicione os materiais utilizados neste atendimento." />
                ) : consumptionItems.map(item => (
                  <div key={item.stock_item_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-sm font-bold text-slate-900">{item.stock_item_name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setConsumptionItems(prev => prev.map(i => i.stock_item_id === item.stock_item_id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} disabled={isLocked || !canEdit} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-400 hover:text-cyan-600 disabled:opacity-50">-</button>
                      <span className="text-sm font-bold text-slate-900 w-4 text-center">{item.qty}</span>
                      <button onClick={() => setConsumptionItems(prev => prev.map(i => i.stock_item_id === item.stock_item_id ? { ...i, qty: i.qty + 1 } : i))} disabled={isLocked || !canEdit} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-400 hover:text-cyan-600 disabled:opacity-50">+</button>
                      {!isLocked && canEdit && <button onClick={() => setConsumptionItems(prev => prev.filter(i => i.stock_item_id !== item.stock_item_id))} className="p-1 text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Photos */}
          {activeSubTab === 'fotos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {!isLocked && canEdit && (
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-cyan-300 hover:text-cyan-500 transition-all cursor-pointer"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-xs font-bold">Adicionar Foto</span>
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              {photos.length === 0 ? (
                <EmptyState title="Nenhuma foto adicionada" description="Adicione fotos clínicas para acompanhamento." />
              ) : photos.map((src, index) => (
                <div key={`${src}-${index}`} className="relative group">
                  <img src={src} alt="Foto clínica" className="aspect-square object-cover rounded-3xl border border-slate-100 shadow-sm" />
                  {!isLocked && canEdit && (
                    <button
                      onClick={() => removePatientPhoto(patientId!, index)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Treatment Plan */}
          {activeSubTab === 'plano' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Planos de Tratamento</h2>
                {!isLocked && canEdit && (
                  <button onClick={() => setShowPlanModal(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700">
                    <Plus className="w-4 h-4" />Novo Plano
                  </button>
                )}
              </div>
              {treatmentPlans.length === 0 ? (
                <EmptyState title="Nenhum plano de tratamento" description="Crie um plano de tratamento para organizar os procedimentos do paciente." />
              ) : treatmentPlans.map(plan => (
                <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">{plan.title}</h3>
                    <span className="text-xs font-bold text-cyan-600">{formatCurrency(plan.total_estimated)}</span>
                  </div>
                  {plan.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className={cn("text-slate-600", item.status === 'done' && "line-through text-slate-400")}>{item.service_name} {item.tooth ? `(Dente ${item.tooth})` : ''}</span>
                      <span className="text-slate-500">{formatCurrency(item.estimated_price)}</span>
                    </div>
                  ))}
                </div>
              ))}

              <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title="Novo Plano de Tratamento" maxWidth="max-w-lg">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título do Plano</label>
                    <input type="text" value={newPlanTitle} onChange={e => setNewPlanTitle(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="Ex: Reabilitação Oral Completa" />
                  </div>
                  {newPlanItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" value={item.service_name} onChange={e => { const items = [...newPlanItems]; items[i].service_name = e.target.value; setNewPlanItems(items); }} className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none" placeholder="Procedimento" />
                      <input type="number" value={item.estimated_price} onChange={e => { const items = [...newPlanItems]; items[i].estimated_price = Number(e.target.value); setNewPlanItems(items); }} className="w-28 px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none" placeholder="Valor" />
                      <button onClick={() => setNewPlanItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                        ? crypto.randomUUID()
                        : `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                      setNewPlanItems(prev => [...prev, { id: newId, service_name: '', tooth: undefined, status: 'pending', estimated_price: 0 }]);
                    }}
                    className="text-sm text-cyan-600 font-bold hover:underline"
                  >
                    + Adicionar Procedimento
                  </button>
                  <button onClick={handleSavePlan} disabled={!newPlanTitle || newPlanItems.length === 0} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl disabled:opacity-50">Criar Plano</button>
                </div>
              </Modal>
            </motion.div>
          )}
        </div>

        {/* Sidebar - Patient Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Resumo Clínico</h3>
            <div className="space-y-4">
              {patientAllergies.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Alergias</p>
                  <p className="text-sm text-amber-900 font-medium">{patientAllergies.join(', ')}</p>
                </div>
              )}
              {appointment && (
                <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100">
                  <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-1">Procedimento Atual</p>
                  <p className="text-sm text-cyan-900 font-medium">{appointment.service_name}</p>
                  <p className="text-xs text-cyan-600 mt-1">Prof: {appointment.professional_name}</p>
                </div>
              )}
              {patientTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {patientTags.map(tag => <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">{tag}</span>)}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Histórico de Atendimentos</h3>
            <div className="space-y-3">
              {clinicAppointments.filter(a => a.patient_id === patientId && a.status === 'done').slice(0, 5).map(a => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{a.service_name}</p>
                    <p className="text-xs text-slate-500">{new Date(a.scheduled_at).toLocaleDateString('pt-BR')} • {a.professional_name}</p>
                  </div>
                </div>
              ))}
              {clinicAppointments.filter(a => a.patient_id === patientId && a.status === 'done').length === 0 && (
                <p className="text-xs text-slate-400">Nenhum atendimento anterior.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
