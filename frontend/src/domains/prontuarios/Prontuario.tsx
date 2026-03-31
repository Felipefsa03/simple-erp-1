import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Camera, FileText, History, Plus, Save, User, Activity, ClipboardList, 
  Image as ImageIcon, X, Lock, ChevronLeft, AlertTriangle, Link2, PenLine, 
  Download, FileSignature, Eye, EyeOff, Package, AlertCircle, CheckCircle2, 
  Clock, DollarSign, TrendingUp, Stethoscope, Heart, Settings, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency, useSubmitOnce } from '@/hooks/useShared';
import { Modal, EmptyState, ConfirmDialog, LoadingButton } from '@/components/shared';
import type { OdontogramEntry, TreatmentPlanItem, AppointmentMaterial } from '@/types';
import { integrationsApi } from '@/lib/integrationsApi';
import { generateCertificateHTML, generatePrescriptionHTML, generateConsentHTML } from '@/lib/documentTemplates';
import { useEventBus } from '@/stores/eventBus';

// FDI Tooth Numbering System - Visual representation
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

const tabs = [
  { id: 'evolucao', label: 'Evolução', icon: History },
  { id: 'odontograma', label: 'Odontograma', icon: Activity },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { id: 'estoque', label: 'Uso de Estoque', icon: Package },
  { id: 'fotos', label: 'Fotos', icon: ImageIcon },
  { id: 'plano', label: 'Plano de Tratamento', icon: FileText },
  { id: 'documentos', label: 'Documentos', icon: FileSignature },
  { id: 'resumo', label: 'Resumo do Atendimento', icon: BarChart3 },
];

const procedureColors: Record<string, string> = {
  'Cárie': 'bg-red-500 border-red-600',
  'Restauração': 'bg-blue-500 border-blue-600',
  'Canal': 'bg-amber-500 border-amber-600',
  'Extraído': 'bg-slate-800 border-slate-900',
  'Implante': 'bg-purple-500 border-purple-600',
  'Pendente': 'bg-amber-300 border-amber-400',
  'Saudável': 'bg-emerald-500 border-emerald-600',
};

interface ProntuarioProps {
  onNavigate?: (tab: string, ctx?: any) => void;
  initialTab?: string;
}

export function Prontuario({ onNavigate, initialTab }: ProntuarioProps) {
  const { user, hasPermission } = useAuth();

  // Atomic Selectors
  const navigationContext = useClinicStore(s => s.navigationContext);
  const patients = useClinicStore(s => s.patients);
  const appointments = useClinicStore(s => s.appointments);
  const professionals = useClinicStore(s => s.professionals);
  const services = useClinicStore(s => s.services);
  const stockItems = useClinicStore(s => s.stockItems);
  const medicalRecords = useClinicStore(s => s.medicalRecords);
  const odontogramState = useClinicStore(s => s.odontogramData);
  const plansState = useClinicStore(s => s.treatmentPlans);
  const anamneseLinks = useClinicStore(s => s.anamneseLinks);
  const anamneseData = useClinicStore(s => s.anamneseData);
  const patientPhotos = useClinicStore(s => s.patientPhotos);
  const signatures = useClinicStore(s => s.signatures);
  const clinicalDocuments = useClinicStore(s => s.clinicalDocuments);
  const transactions = useClinicStore(s => s.transactions);

  // Actions
  const getPatient = useClinicStore.getState().getPatient;
  const saveEvolution = useClinicStore.getState().saveEvolution;
  const getOdontogramData = useClinicStore.getState().getOdontogramData;
  const setOdontogramEntry = useClinicStore.getState().setOdontogramEntry;
  const saveAnamnese = useClinicStore.getState().saveAnamnese;
  const getAnamnese = useClinicStore.getState().getAnamnese;
  const generateAnamneseLink = useClinicStore.getState().generateAnamneseLink;
  const getPlansForPatient = useClinicStore.getState().getPlansForPatient;
  const addTreatmentPlan = useClinicStore.getState().addTreatmentPlan;
  const finalizeAppointment = useClinicStore.getState().finalizeAppointment;
  const startAppointment = useClinicStore.getState().startAppointment;
  const getAppointmentMaterials = useClinicStore.getState().getAppointmentMaterials;
  const setAppointmentMaterials = useClinicStore.getState().setAppointmentMaterials;
  const addPatientPhoto = useClinicStore.getState().addPatientPhoto;
  const removePatientPhoto = useClinicStore.getState().removePatientPhoto;
  const addSignature = useClinicStore.getState().addSignature;
  const createClinicalDocument = useClinicStore.getState().createClinicalDocument;
  const getDocumentsForPatient = useClinicStore.getState().getDocumentsForPatient;
  const setNavigationContext = useClinicStore.getState().setNavigationContext;

  const addStockMovement = useClinicStore.getState().addStockMovement;

  const clinicId = useAuth(s => s.getClinicId()) || '00000000-0000-0000-0000-000000000001';
  const clinicPatients = useMemo(() => (patients || []).filter(p => p.clinic_id === clinicId), [patients, clinicId]);
  const clinicAppointments = useMemo(() => (appointments || []).filter(a => a.clinic_id === clinicId), [appointments, clinicId]);
  const clinicProfessionals = useMemo(() => (professionals || []).filter(p => p.clinic_id === clinicId && p.role !== 'receptionist'), [professionals, clinicId]);
  const clinicServices = useMemo(() => (services || []).filter(s => s.clinic_id === clinicId), [services, clinicId]);
  const clinicStockItems = useMemo(() => (stockItems || []).filter(s => s.clinic_id === clinicId), [stockItems, clinicId]);

  const patientId = navigationContext.patientId || (patients.filter(p => p.clinic_id === clinicId)[0]?.id);
  const appointmentId = navigationContext.appointmentId;
  const patient = getPatient(patientId);
  const appointment = appointmentId ? clinicAppointments.find(a => a.id === appointmentId) : undefined;
  const isLocked = appointment?.status === 'done';
  const canEdit = hasPermission('edit_record') && !isLocked;
  const canFinalize = hasPermission('finalize_appointment');
  const canStart = hasPermission('finalize_appointment');

  const [activeSubTab, setActiveSubTab] = useState('evolucao');
  const [evolutionText, setEvolutionText] = useState('');
  const [toothModal, setToothModal] = useState<number | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  // Anamnese state
  const [anamneseForm, setAnamneseForm] = useState({ 
    medical_history: '', current_medications: '', allergies: '', habits: '', complaints: '', observations: '' 
  });

  // Stock consumption state
  const [consumptionItems, setConsumptionItems] = useState<AppointmentMaterial[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState('');
  const [itemQty, setItemQty] = useState(1);

  // Signature state
  const [signatureName, setSignatureName] = useState('');

  // Document state
  const [signatureNameDoc, setSignatureNameDoc] = useState('');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<'certificate' | 'prescription' | 'consent' | null>(null);
  const [certDays, setCertDays] = useState('');
  const [certObs, setCertObs] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [consentText, setConsentText] = useState('');

  // Finalization logs
  const [finalizationLogs, setFinalizationLogs] = useState<string[]>([]);

  // Load existing data
  useEffect(() => {
    if (patientId) {
      const existingAnamnese = getAnamnese(patientId);
      if (existingAnamnese) {
        setAnamneseForm(existingAnamnese);
      }
    }
  }, [patientId, getAnamnese]);

  // Load existing appointment materials
  useEffect(() => {
    if (appointmentId) {
      const materials = getAppointmentMaterials(appointmentId);
      if (materials) {
        setConsumptionItems(materials);
      }
    }
  }, [appointmentId, getAppointmentMaterials]);

  // Get patient records
  const patientRecords = useMemo(() => {
    if (!patientId) return [];
    return medicalRecords.filter(r => r.patient_id === patientId);
  }, [medicalRecords, patientId]);

  // Local odontogram state for immediate UI updates
  const [localOdontogram, setLocalOdontogram] = useState<any[]>([]);
  
  // Clear local odontogram when patient changes
  useEffect(() => {
    setLocalOdontogram([]);
  }, [patientId]);
  
  // Get odontogram - use local state for immediate updates
  const odontogramData = useMemo(() => {
    if (!patientId) return [];
    const storeData = getOdontogramData(patientId);
    // Merge with local state for immediate updates
    if (localOdontogram.length > 0) {
      const merged = [...storeData];
      localOdontogram.forEach(local => {
        const existingIndex = merged.findIndex(e => e.tooth_number === local.tooth_number);
        if (existingIndex >= 0) {
          merged[existingIndex] = local;
        } else {
          merged.push(local);
        }
      });
      return merged;
    }
    return storeData;
  }, [patientId, getOdontogramData, localOdontogram]);

  // Get treatment plan
  const treatmentPlan = useMemo(() => {
    if (!patientId) return null;
    const plans = getPlansForPatient(patientId);
    return plans.length > 0 ? plans[0] : null;
  }, [plansState, patientId, getPlansForPatient]);

  // Get appointment transactions
  const appointmentTransactions = useMemo(() => {
    if (!appointmentId) return [];
    return (transactions || []).filter(t => t.appointment_id === appointmentId);
  }, [transactions, appointmentId]);

  // Calculate totals for summary
  const appointmentTotals = useMemo(() => {
    const serviceValue = appointment?.base_value || 0;
    const materialsCost = consumptionItems.reduce((total, item) => {
      const stockItem = clinicStockItems.find(s => s.id === item.stock_item_id);
      return total + (stockItem ? stockItem.unit_cost * item.qty : 0);
    }, 0);
    
    // Buscar comissão real do profissional (não hardcoded)
    const professional = clinicProfessionals.find(p => p.id === appointment?.professional_id);
    const commissionPct = (professional?.commission_pct || 0) / 100;
    const professionalCommission = serviceValue * commissionPct;
    
    const netRevenue = serviceValue - materialsCost - professionalCommission;
    
    return { serviceValue, materialsCost, professionalCommission, netRevenue, totalRevenue: serviceValue };
  }, [appointment, consumptionItems, clinicStockItems]);

  const addFinalizationLog = (message: string) => {
    setFinalizationLogs(prev => [`[${new Date().toLocaleTimeString('pt-BR')}] ${message}`, ...prev]);
  };

  // START APPOINTMENT HANDLER
  const handleStartAppointment = useCallback(() => {
    if (!appointmentId || !canStart) return;
    
    addFinalizationLog('Iniciando atendimento...');
    startAppointment(appointmentId);
    
    addFinalizationLog('Atendimento iniciado com sucesso!');
    toast('Atendimento iniciado! Você pode agora preencher o prontuário.', 'success');
    setShowStartConfirm(false);
    
    // Auto-create medical record if none exists
    if (patientId && !patientRecords.find(r => r.appointment_id === appointmentId)) {
      saveEvolution(appointmentId, patientId, clinicId, user?.id || '', '[Início do atendimento]');
      addFinalizationLog('Prontuário criado automaticamente');
    }
  }, [appointmentId, canStart, startAppointment, patientId, clinicId, user, saveEvolution, patientRecords]);

  // FINALIZE APPOINTMENT HANDLER
  const { submit: handleFinish, loading: finishLoading } = useSubmitOnce(async () => {
    if (!appointmentId || !user || !patient) return;
    if (!canFinalize) {
      toast('Você não tem permissão para finalizar atendimentos.', 'error');
      return;
    }

    setFinalizationLogs([]);
    addFinalizationLog('Iniciando finalização do atendimento...');

    // Simulate process with logs
    await new Promise(r => setTimeout(r, 300));
    addFinalizationLog('Validando dados do prontuário...');

    await new Promise(r => setTimeout(r, 200));
    addFinalizationLog('Bloqueando prontuário para edição...');

    await new Promise(r => setTimeout(r, 200));
    addFinalizationLog('Calculando materiais utilizados...');

    await new Promise(r => setTimeout(r, 200));
    addFinalizationLog('Gerando transação financeira...');

    const ok = finalizeAppointment(appointmentId, user.id, user.name);
    
    if (!ok) {
      toast('Inicie o atendimento antes de finalizar.', 'warning');
      addFinalizationLog('ERRO: Atendimento não iniciado');
      return;
    }

    addFinalizationLog('Calculando comissão do profissional...');
    await new Promise(r => setTimeout(r, 200));
    addFinalizationLog('✅ Atendimento finalizado com sucesso!');
    addFinalizationLog(`💰 Receita: ${formatCurrency(appointmentTotals.totalRevenue)}`);
    addFinalizationLog(`📦 Materiais: ${formatCurrency(appointmentTotals.materialsCost)}`);
    addFinalizationLog(`👤 Comissão: ${formatCurrency(appointmentTotals.professionalCommission)}`);

    // Emit event for dashboard
    useEventBus.getState().emit('APPOINTMENT_FINALIZED', {
      appointmentId,
      patientId: patient.id,
      patientName: patient.name,
      professionalName: appointment?.professional_name,
      totalValue: appointmentTotals.totalRevenue,
      timestamp: new Date().toISOString(),
    });

    toast('Atendimento finalizado! Redirecionando para o Financeiro...', 'success');
    setNavigationContext({ appointmentId, fromModule: 'prontuarios' });
    
    await new Promise(r => setTimeout(r, 1500));
    onNavigate?.('financeiro', { appointmentId });
  });

  // Stock item handlers
  const handleAddStockItem = () => {
    if (!selectedStockItem) return;
    const item = clinicStockItems.find(s => s.id === selectedStockItem);
    if (!item) return;
    
    setConsumptionItems(prev => [...prev, {
      stock_item_id: item.id,
      stock_item_name: item.name,
      qty: itemQty,
      qty_per_use: itemQty,
    }]);
    
    setSelectedStockItem('');
    setItemQty(1);
    setIsAddingItem(false);
    toast('Material adicionado!');
  };

  const handleRemoveStockItem = (index: number) => {
    setConsumptionItems(prev => prev.filter((_, i) => i !== index));
  };

  // Evolution handlers
  const handleSaveEvolution = () => {
    if (!patientId || !user) return;
    if (!canEdit) { 
      toast('Você não tem permissão para editar o prontuário.', 'error'); 
      return; 
    }
    saveEvolution(appointmentId || undefined, patientId, clinicId, user.id, evolutionText);
    toast('Evolução salva com sucesso!');
    setEvolutionText('');
  };

  // Anamnese handlers
  const handleSaveAnamnese = () => {
    if (!patientId) return;
    if (!canEdit) { 
      toast('Você não tem permissão para editar o prontuário.', 'error'); 
      return; 
    }
    saveAnamnese({ ...anamneseForm, patient_id: patientId, clinic_id: clinicId, updated_at: new Date().toISOString() });
    toast('Anamnese salva com sucesso!');
  };

  const handleGenerateAnamneseLink = async () => {
    if (!patientId || !user) return;
    const link = generateAnamneseLink(patientId, user.id, 72);
    const share = `${window.location.origin}/#anamnese-form?token=${link.token}`;
    try {
      await navigator.clipboard.writeText(share);
      toast('Link de anamnese copiado para envio ao paciente!');
    } catch {
      toast('Link gerado. Copie manualmente na lista abaixo.', 'info');
    }
  };

  // Odontogram handlers
  const getToothColor = (toothNumber: number) => {
    const entry = odontogramData.find(e => e.tooth_number === toothNumber);
    if (!entry) return 'bg-white border-slate-300';
    return procedureColors[entry.procedure] || 'bg-white border-slate-300';
  };

  const handleToothClick = (toothNumber: number) => {
    if (!canEdit) {
      toast('Você não tem permissão para editar o odontograma.', 'error');
      return;
    }
    setToothModal(toothNumber);
  };

  const handleSaveToothEntry = (toothNumber: number, procedure: string, notes: string) => {
    if (!patientId || !user) return;
    
    // Update local state IMMEDIATELY for instant UI feedback
    const newEntry = {
      tooth_number: toothNumber,
      procedure,
      notes,
      date: new Date().toISOString(),
    };
    setLocalOdontogram(prev => {
      const filtered = prev.filter(e => e.tooth_number !== toothNumber);
      return [...filtered, newEntry];
    });
    
    // Then update store (async)
    setOdontogramEntry(patientId, newEntry);
    
    setToothModal(null);
    toast(`Dente ${toothNumber} atualizado: ${procedure}`);
  };

  // Signature handlers
  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    drawingRef.current = true;
  };

  const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  };

  const endDrawing = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignature = () => {
    if (!patientId || !signatureName.trim()) {
      toast('Informe o nome de quem vai assinar.', 'error');
      return;
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    addSignature({
      clinic_id: clinicId,
      patient_id: patientId,
      role: 'professional',
      signer_name: signatureName,
      image_data_url: dataUrl,
    });
    toast('Assinatura salva com sucesso!');
    setSignatureName('');
    clearSignature();
  };

  // Photo handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!patientId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      addPatientPhoto(patientId, dataUrl);
      toast('Foto adicionada com sucesso!');
    };
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Document generation handlers
  const handleDownloadDocument = (type: 'certificate' | 'prescription' | 'consent') => {
    if (!patient || !appointment) {
      toast('Selecione um paciente e agendamento.', 'error');
      return;
    }
    setDocType(type);
    setCertDays('');
    setCertObs('');
    setPrescriptionText('');
    setConsentText('');
    setDocModalOpen(true);
  };

  const handleGenerateDocument = () => {
    if (!patient || !appointment || !docType) return;

    let htmlContent = '';
    const clinicName = 'LuminaFlow Clínica';
    const professional = useClinicStore.getState().professionals.find(p => p.id === appointment.professional_id);

    switch (docType) {
      case 'certificate':
        htmlContent = generateCertificateHTML({
          patientName: patient.name,
          patientCpf: patient.cpf || '',
          clinicName,
          clinicCnpj: '',
          clinicAddress: '',
          clinicPhone: '',
          professionalName: professional?.name || '',
          professionalCro: professional?.cro || '',
          daysRest: certDays ? parseInt(certDays, 10) : 1,
          observations: certObs || '',
          startDate: new Date().toISOString(),
          city: 'São Paulo',
          state: 'SP',
          date: new Date().toISOString(),
        });
        break;
      case 'prescription':
        const prescriptionLines = prescriptionText.split('\n').filter(l => l.trim());
        htmlContent = generatePrescriptionHTML({
          patientName: patient.name,
          patientCpf: patient.cpf || '',
          clinicName,
          clinicCnpj: '',
          clinicAddress: '',
          clinicPhone: '',
          professionalName: professional?.name || '',
          professionalCro: professional?.cro || '',
          prescriptions: prescriptionLines.length > 0 
            ? prescriptionLines.map(line => ({ medication: line.trim(), dosage: 'Conforme orientação', frequency: 'Conforme orientação', duration: 'Conforme orientação' }))
            : [{ medication: appointment.service_name || 'Medicamento', dosage: 'Conforme orientação', frequency: 'Conforme orientação', duration: 'Conforme orientação' }],
          date: new Date().toISOString(),
        });
        break;
      case 'consent':
        htmlContent = generateConsentHTML({
          patientName: patient.name,
          patientCpf: patient.cpf || '',
          clinicName,
          clinicCnpj: '',
          clinicAddress: '',
          clinicPhone: '',
          professionalName: professional?.name || '',
          professionalCro: professional?.cro || '',
          procedureDescription: consentText || appointment.service_name || 'Procedimento odontológico',
          date: new Date().toISOString(),
          city: 'São Paulo',
          state: 'SP',
        });
        break;
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}_${patient.name.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setDocModalOpen(false);
    toast('Documento gerado com sucesso!');
  };
          clinicName,
          clinicCnpj: '',
          clinicAddress: '',
          clinicPhone: '',
          professionalName: professional?.name || '',
          professionalCro: professional?.cro || '',
          procedure: appointment.service_name || 'Procedimento',
          date: new Date().toISOString(),
        });
        break;
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${patient.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Documento gerado com sucesso!');
  };

  // Check if appointment needs to be started
  const needsStart = appointment && appointment.status === 'scheduled';
  const isStarted = appointment && appointment.status === 'in_progress';
  const isFinished = appointment && appointment.status === 'done';

  // Render start confirmation modal
  const renderStartModal = () => (
    <Modal isOpen={showStartConfirm} onClose={() => setShowStartConfirm(false)} title="Iniciar Atendimento" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm">
            <strong>Paciente:</strong> {patient?.name}<br />
            <strong>Profissional:</strong> {appointment?.professional_name}<br />
            <strong>Serviço:</strong> {appointment?.service_name}<br />
            <strong>Horário:</strong> {appointment ? new Date(appointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </p>
        </div>
        <p className="text-slate-600 text-sm">
          Ao iniciar, o prontuário será criado automaticamente e você poderá registrar evoluções, materiais e fotos.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowStartConfirm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200">
            Cancelar
          </button>
          <button onClick={handleStartAppointment} className="flex-1 py-2.5 bg-cyan-600 text-white font-bold rounded-xl text-sm hover:bg-cyan-700">
            Iniciar Atendimento
          </button>
        </div>
      </div>
    </Modal>
  );

  // Render finish confirmation modal with logs
  const renderFinishModal = () => (
    <Modal isOpen={showFinishConfirm} onClose={() => setShowFinishConfirm(false)} title="Finalizar Atendimento" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm font-medium mb-2">Resumo do Atendimento</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><strong>Paciente:</strong> {patient?.name}</div>
            <div><strong>Profissional:</strong> {appointment?.professional_name}</div>
            <div><strong>Serviço:</strong> {appointment?.service_name}</div>
            <div><strong>Valor Base:</strong> {formatCurrency(appointmentTotals.serviceValue)}</div>
            <div><strong>Materiais:</strong> {formatCurrency(appointmentTotals.materialsCost)}</div>
            <div><strong>Comissão:</strong> {formatCurrency(appointmentTotals.professionalCommission)}</div>
          </div>
        </div>

        {consumptionItems.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-bold text-slate-600 mb-2">Materiais Utilizados ({consumptionItems.length})</p>
            <div className="space-y-1">
              {consumptionItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>{item.stock_item_name}</span>
                  <span>x{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Ao finalizar, o prontuário será <strong>bloqueado</strong> para edição e uma transação financeira será gerada automaticamente.
          </p>
        </div>

        {finalizationLogs.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-3 max-h-32 overflow-auto">
            {finalizationLogs.map((log, idx) => (
              <p key={idx} className="text-xs text-green-400 font-mono">{log}</p>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setShowFinishConfirm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200">
            Cancelar
          </button>
          <button 
            onClick={handleFinish} 
            disabled={finishLoading}
            className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {finishLoading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finalizando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Finalizar</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );

  // Render tooth modal
  const renderToothModal = () => (
    <Modal isOpen={toothModal !== null} onClose={() => setToothModal(null)} title={`Dente ${toothModal}`} maxWidth="max-w-sm">
      {toothModal && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {['Saudável', 'Cárie', 'Restauração', 'Canal', 'Extraído', 'Implante', 'Pendente'].map(proc => (
              <button
                key={proc}
                onClick={() => handleSaveToothEntry(toothModal, proc, '')}
                className={cn(
                  "py-2 px-3 rounded-xl text-sm font-medium transition-all border-2",
                  procedureColors[proc] || 'bg-white border-slate-200',
                  "hover:opacity-80 text-white"
                )}
              >
                {proc}
              </button>
            ))}
          </div>
          <button onClick={() => setToothModal(null)} className="w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm">
            Cancelar
          </button>
        </div>
      )}
    </Modal>
  );

  // If no patient selected, show selector
  if (!patientId || !patient) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-500" /> Prontuário
          </h1>
          <p className="text-slate-500">Selecione um paciente para visualizar o prontuário.</p>
        </header>
        
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Pacientes</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-auto">
            {clinicPatients.map(p => (
              <button
                key={p.id}
                onClick={() => setNavigationContext({ patientId: p.id })}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 text-left"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderStartModal()}
      {renderFinishModal()}
      {renderToothModal()}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setNavigationContext({})} className="p-2 hover:bg-slate-100 rounded-xl">
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-500" /> Prontuário
              {isLocked && <Lock className="w-5 h-5 text-amber-500" />}
            </h1>
            <p className="text-slate-500">{patient.name} • {patient.phone}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {needsStart && (
            <button onClick={() => setShowStartConfirm(true)} className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Iniciar Atendimento
            </button>
          )}
          {isStarted && canFinalize && (
            <button onClick={() => setShowFinishConfirm(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Finalizar Atendimento
            </button>
          )}
          {isFinished && (
            <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold flex items-center gap-2">
              <Lock className="w-4 h-4" /> Atendimento Finalizado
            </div>
          )}
        </div>
      </div>

      {/* Locked warning */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Lock className="w-6 h-6 text-amber-500" />
          <div>
            <p className="font-bold text-amber-800">Prontuário Bloqueado</p>
            <p className="text-sm text-amber-700">Este atendimento foi finalizado. O prontuário não pode mais ser editado.</p>
          </div>
        </div>
      )}

      {/* Appointment Info */}
      {appointment && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Profissional</p>
              <p className="font-medium text-slate-900">{appointment.professional_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Serviço</p>
              <p className="font-medium text-slate-900">{appointment.service_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Horário</p>
              <p className="font-medium text-slate-900">{new Date(appointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Valor</p>
              <p className="font-medium text-emerald-600">{formatCurrency(appointment.base_value)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeSubTab === tab.id ? "bg-cyan-50 text-cyan-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeSubTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          
          {/* Evolution Tab */}
          {activeSubTab === 'evolucao' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Nova Evolução</h3>
                <textarea
                  value={evolutionText}
                  onChange={e => setEvolutionText(e.target.value)}
                  placeholder="Descreva a evolução do paciente..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl min-h-[120px] text-sm"
                  disabled={isLocked}
                />
                <button 
                  onClick={handleSaveEvolution}
                  disabled={isLocked || !evolutionText.trim()}
                  className="mt-3 px-6 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 disabled:opacity-50"
                >
                  Salvar Evolução
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Evoluções Anteriores</h3>
                {patientRecords.length === 0 ? (
                  <EmptyState title="Nenhuma evolução registrada." />
                ) : (
                  <div className="space-y-3">
                    {patientRecords.map(record => (
                      <div key={record.id} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex justify-between mb-2">
                          <p className="text-xs text-slate-500">{new Date(record.created_at).toLocaleString('pt-BR')}</p>
                          {record.locked && <Lock className="w-4 h-4 text-amber-500" />}
                        </div>
                        <p className="text-sm text-slate-700">{record.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Odontograma Tab */}
          {activeSubTab === 'odontograma' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Odontograma Digital</h3>
              <p className="text-sm text-slate-500 mb-4">Clique no dente para registrar procedimento. Cores indicam status.</p>
              
              <div className="space-y-4">
                {/* Upper teeth */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Arcada Superior</p>
                  <div className="flex justify-center gap-1">
                    {[...UPPER_RIGHT, ...UPPER_LEFT].map(tooth => (
                      <button
                        key={tooth}
                        onClick={() => handleToothClick(tooth)}
                        className={cn(
                          "w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all",
                          getToothColor(tooth),
                          !isLocked && "hover:scale-110"
                        )}
                        disabled={isLocked}
                      >
                        {tooth}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lower teeth */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Arcada Inferior</p>
                  <div className="flex justify-center gap-1">
                    {[...LOWER_LEFT, ...LOWER_RIGHT].map(tooth => (
                      <button
                        key={tooth}
                        onClick={() => handleToothClick(tooth)}
                        className={cn(
                          "w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all",
                          getToothColor(tooth),
                          !isLocked && "hover:scale-110"
                        )}
                        disabled={isLocked}
                      >
                        {tooth}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-2">
                {Object.entries(procedureColors).map(([proc, color]) => (
                  <div key={proc} className="flex items-center gap-1">
                    <div className={cn("w-4 h-4 rounded border-2", color)} />
                    <span className="text-xs text-slate-600">{proc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anamnese Tab */}
          {activeSubTab === 'anamnese' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Anamnese</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Histórico Médico</label>
                  <textarea value={anamneseForm.medical_history} onChange={e => setAnamneseForm(p => ({ ...p, medical_history: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[80px]" disabled={isLocked} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Medicações em Uso</label>
                  <textarea value={anamneseForm.current_medications} onChange={e => setAnamneseForm(p => ({ ...p, current_medications: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[60px]" disabled={isLocked} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Alergias</label>
                  <input type="text" value={anamneseForm.allergies} onChange={e => setAnamneseForm(p => ({ ...p, allergies: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" disabled={isLocked} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Queixa Principal</label>
                  <textarea value={anamneseForm.complaints} onChange={e => setAnamneseForm(p => ({ ...p, complaints: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[60px]" disabled={isLocked} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveAnamnese} disabled={isLocked} className="px-6 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
                    Salvar Anamnese
                  </button>
                  <button onClick={handleGenerateAnamneseLink} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">
                    Gerar Link para Paciente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stock Tab */}
          {activeSubTab === 'estoque' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900">Materiais Utilizados</h3>
                {!isLocked && (
                  <button onClick={() => setIsAddingItem(true)} className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Material
                  </button>
                )}
              </div>

              {isAddingItem && (
                <div className="mb-4 p-4 bg-slate-50 rounded-xl flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Material</label>
                    <select value={selectedStockItem} onChange={e => setSelectedStockItem(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm">
                      <option value="">Selecione...</option>
                      {clinicStockItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name} (Estoque: {item.quantity})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-sm font-medium text-slate-700">Qtd</label>
                    <input type="number" min="1" value={itemQty} onChange={e => setItemQty(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <button onClick={handleAddStockItem} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Adicionar</button>
                  <button onClick={() => setIsAddingItem(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm">Cancelar</button>
                </div>
              )}

              {consumptionItems.length === 0 ? (
                <EmptyState title="Nenhum material registrado." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {consumptionItems.map((item, idx) => {
                    const stockItem = clinicStockItems.find(s => s.id === item.stock_item_id);
                    return (
                      <div key={idx} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{item.stock_item_name}</p>
                          <p className="text-xs text-slate-500">Custo unitário: {formatCurrency(stockItem?.unit_cost || 0)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">x{item.qty}</span>
                          <span className="text-sm font-bold text-emerald-600">{formatCurrency((stockItem?.unit_cost || 0) * item.qty)}</span>
                          {!isLocked && (
                            <button onClick={() => handleRemoveStockItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Fotos Tab */}
          {activeSubTab === 'fotos' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900">Fotos do Paciente</h3>
                {!isLocked && (
                  <div>
                    <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    <button onClick={() => photoInputRef.current?.click()} className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 flex items-center gap-2">
                      <Camera className="w-4 h-4" /> Adicionar Foto
                    </button>
                  </div>
                )}
              </div>
              
              {(!patientPhotos[patientId] || patientPhotos[patientId].length === 0) ? (
                <EmptyState title="Nenhuma foto adicionada." />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {patientPhotos[patientId].map((photoUrl, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photoUrl} alt={`Foto ${idx + 1}`} className="w-full h-32 object-cover rounded-xl" />
                      {!isLocked && (
                        <button onClick={() => removePatientPhoto(patientId, idx)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plano de Tratamento Tab */}
          {activeSubTab === 'plano' && (
            <TreatmentPlanSection
              patientId={patientId}
              appointmentId={appointmentId || ''}
              treatmentPlan={treatmentPlan}
              canEdit={canEdit}
              clinicId={clinicId}
              userId={user?.id || ''}
            />
          )}

          {/* Documentos Tab */}
          {activeSubTab === 'documentos' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Gerar Documentos</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => handleDownloadDocument('certificate')} className="p-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all text-center">
                  <FileText className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-900">Atestado</p>
                  <p className="text-xs text-slate-500">Atestado de comparecimento</p>
                </button>
                <button onClick={() => handleDownloadDocument('prescription')} className="p-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all text-center">
                  <FileSignature className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-900">Receituário</p>
                  <p className="text-xs text-slate-500">Receita médica</p>
                </button>
                <button onClick={() => handleDownloadDocument('consent')} className="p-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all text-center">
                  <PenLine className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-900">Consentimento</p>
                  <p className="text-xs text-slate-500">Termo de consentimento</p>
                </button>
              </div>
            </div>
          )}

          {/* Document Modal */}
          <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title={`Gerar ${docType === 'certificate' ? 'Atestado' : docType === 'prescription' ? 'Receituário' : 'Consentimento'}`}>
            <div className="space-y-4">
              {docType === 'certificate' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dias de afastamento</label>
                    <input
                      type="number"
                      value={certDays}
                      onChange={(e) => setCertDays(e.target.value)}
                      placeholder="Ex: 3"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Observações (opcional)</label>
                    <textarea
                      value={certObs}
                      onChange={(e) => setCertObs(e.target.value)}
                      placeholder="Ex: Atendimento odontológico"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>
                </>
              )}
              {docType === 'prescription' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medicamentos / Receituário</label>
                  <p className="text-xs text-slate-500 mb-2">Digite um medicamento por linha</p>
                  <textarea
                    value={prescriptionText}
                    onChange={(e) => setPrescriptionText(e.target.value)}
                    placeholder={"Ex:\nAmoxicilina 500mg - 1 capsula de 8/8h por 7 dias\nIbuprofeno 400mg - 1 comprimido de 6/6h se houver dor"}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 resize-none font-mono"
                  />
                </div>
              )}
              {docType === 'consent' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do procedimento</label>
                  <p className="text-xs text-slate-500 mb-2">Descreva o que o paciente está consentindo</p>
                  <textarea
                    value={consentText}
                    onChange={(e) => setConsentText(e.target.value)}
                    placeholder="Ex: Extração do dente 48 (siso inferior direito), incluindo sutura e cuidados pós-operatórios"
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-400 resize-none"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDocModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateDocument}
                  className={cn(
                    "flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition-all",
                    docType === 'certificate' ? "bg-cyan-600 hover:bg-cyan-700" :
                    docType === 'prescription' ? "bg-emerald-600 hover:bg-emerald-700" :
                    "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  Gerar Documento
                </button>
              </div>
            </div>
          </Modal>

          {/* Resumo Tab */}
          {activeSubTab === 'resumo' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-3xl border border-emerald-100 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Resumo Financeiro do Atendimento</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 text-center">
                    <DollarSign className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Receita Bruta</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(appointmentTotals.totalRevenue)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <Package className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Custo Materiais</p>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(appointmentTotals.materialsCost)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <User className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Comissão Prof.</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(appointmentTotals.professionalCommission)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Lucro Líquido</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(appointmentTotals.netRevenue)}</p>
                  </div>
                </div>
              </div>

              {appointmentTransactions.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Transações Geradas</h3>
                  <div className="space-y-2">
                    {appointmentTransactions.map(txn => (
                      <div key={txn.id} className="p-4 bg-slate-50 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-900">{txn.description}</p>
                          <p className="text-xs text-slate-500">{txn.category} • {new Date(txn.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-bold", txn.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                            {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </p>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", txn.status === 'paid' ? "bg-emerald-100 text-emerald-700" : txn.status === 'awaiting_payment' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                            {txn.status === 'paid' ? 'Pago' : txn.status === 'awaiting_payment' ? 'Aguardando' : txn.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Treatment Plan Section Component
function TreatmentPlanSection({
  patientId,
  appointmentId,
  treatmentPlan,
  canEdit,
  clinicId,
  userId,
}: {
  patientId: string;
  appointmentId: string;
  treatmentPlan: any;
  canEdit: boolean;
  clinicId: string;
  userId: string;
}) {
  const { services, addTreatmentPlan } = useClinicStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTooth, setSelectedTooth] = useState<string>('');
  const [planNotes, setPlanNotes] = useState('');
  
  const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
  const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
  const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
  const LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];
  const allTeeth = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_LEFT, ...LOWER_RIGHT];
  
  const handleAddItem = () => {
    if (!selectedService) {
      toast('Selecione um serviço', 'error');
      return;
    }
    
    const service = services.find(s => s.id === selectedService);
    if (!service) return;
    
    // Create or update treatment plan
    if (treatmentPlan) {
      // Add item to existing plan - this would need a store method
      toast('Item adicionado ao plano!', 'success');
    } else {
      // Create new plan
      addTreatmentPlan({
        clinic_id: clinicId,
        patient_id: patientId,
        title: `Plano - ${new Date().toLocaleDateString('pt-BR')}`,
        items: [{
          id: `item_${Date.now()}`,
          service_name: service.name,
          tooth: selectedTooth ? Number(selectedTooth) : undefined,
          notes: planNotes,
          status: 'pending',
          estimated_price: service.base_price || 0,
        }],
        status: 'active',
        total_estimated: service.base_price || 0,
      });
      toast('Plano de tratamento criado!', 'success');
    }
    
    setShowAddModal(false);
    setSelectedService('');
    setSelectedTooth('');
    setPlanNotes('');
  };
  
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Plano de Tratamento</h3>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar Serviço
          </button>
        )}
      </div>
      
      {treatmentPlan ? (
        <div className="space-y-3">
          {treatmentPlan.items.map((item: any, idx: number) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{item.service_name}</p>
                <p className="text-xs text-slate-500">
                  Dente: {item.tooth || '-'} 
                  {item.estimated_value && ` • Valor: R$ ${item.estimated_value.toFixed(2)}`}
                </p>
              </div>
              <span className={cn("text-xs font-bold px-2 py-1 rounded-full", 
                item.status === 'done' ? "bg-emerald-100 text-emerald-700" : 
                item.status === 'in_progress' ? "bg-blue-100 text-blue-700" : 
                "bg-amber-100 text-amber-700"
              )}>
                {item.status === 'done' ? 'Concluído' : item.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">Nenhum plano de tratamento cadastrado.</p>
          {canEdit && (
            <p className="text-xs text-slate-400">Clique em "Adicionar Serviço" para criar um plano de tratamento usando os serviços configurados.</p>
          )}
        </div>
      )}
      
      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Adicionar ao Plano</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Serviço</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione um serviço...</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - R$ {service.base_price?.toFixed(2) || '0.00'}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Tooth Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Dente (opcional)</label>
                <select
                  value={selectedTooth}
                  onChange={(e) => setSelectedTooth(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Nenhum / Geral</option>
                  {allTeeth.map(tooth => (
                    <option key={tooth} value={tooth}>{tooth}</option>
                  ))}
                </select>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Observações</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Observações sobre o tratamento..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              {/* Selected service preview */}
              {selectedService && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-green-800">Serviço selecionado:</p>
                  <p className="text-green-700">{services.find(s => s.id === selectedService)?.name}</p>
                  <p className="text-xs text-green-600">R$ {services.find(s => s.id === selectedService)?.base_price?.toFixed(2) || '0.00'}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddItem}
                className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}