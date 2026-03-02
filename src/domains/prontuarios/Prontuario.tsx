import React from 'react';
import { 
  Mic, 
  Camera, 
  FileText, 
  History, 
  Plus, 
  ChevronRight, 
  Save,
  User,
  Activity,
  ClipboardList,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const tabs = [
  { id: 'evolucao', label: 'Evolução', icon: History },
  { id: 'odontograma', label: 'Odontograma', icon: Activity },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { id: 'estoque', label: 'Uso de Estoque', icon: Plus },
  { id: 'fotos', label: 'Fotos', icon: ImageIcon },
  { id: 'plano', label: 'Plano de Tratamento', icon: FileText },
];

interface ProntuarioProps {
  onNavigate?: (tab: string) => void;
}

export function Prontuario({ onNavigate }: ProntuarioProps) {
  const [activeSubTab, setActiveSubTab] = React.useState('evolucao');
  const [isRecording, setIsRecording] = React.useState(false);
  const [selectedProcedure, setSelectedProcedure] = React.useState<string | null>(null);
  const [teethStatus, setTeethStatus] = React.useState<Record<number, string>>({});
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [isAddingItem, setIsAddingItem] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState('');
  const [consumptionItems, setConsumptionItems] = React.useState([
    { id: 1, name: 'Resina A2', qty: 1, unit: 'un' },
    { id: 2, name: 'Anestésico Lidocaína', qty: 2, unit: 'tubetes' },
    { id: 3, name: 'Sugador Descartável', qty: 1, unit: 'un' },
  ]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleToothClick = (toothNum: number) => {
    if (selectedProcedure) {
      setTeethStatus(prev => ({
        ...prev,
        [toothNum]: selectedProcedure
      }));
      triggerSuccess(`Procedimento "${selectedProcedure}" marcado no dente ${toothNum}`);
    } else {
      alert('Selecione um procedimento abaixo primeiro');
    }
  };

  const getToothColor = (toothNum: number) => {
    const status = teethStatus[toothNum];
    if (!status) return 'bg-white';
    switch (status) {
      case 'Cárie': return 'bg-red-500';
      case 'Restauração': return 'bg-blue-500';
      case 'Canal': return 'bg-amber-500';
      case 'Extraído': return 'bg-slate-900';
      default: return 'bg-white';
    }
  };

  const handleFinish = () => {
    triggerSuccess('Atendimento Finalizado! Redirecionando para o Financeiro para pagamento...');
    setTimeout(() => {
      onNavigate?.('financeiro');
    }, 2000);
  };

  const handlePrint = () => {
    triggerSuccess('Preparando prontuário para impressão...');
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem = {
      id: Date.now(),
      name: newItemName,
      qty: 1,
      unit: 'un'
    };
    setConsumptionItems(prev => [...prev, newItem]);
    setNewItemName('');
    setIsAddingItem(false);
    triggerSuccess(`Item "${newItem.name}" adicionado ao consumo.`);
  };

  const handleRemoveItem = (id: number) => {
    setConsumptionItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateQty = (id: number, delta: number) => {
    setConsumptionItems(prev => prev.map(item => 
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    ));
  };

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2"
          >
            <Plus className="w-5 h-5 rotate-45" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ana Paula Souza</h1>
            <p className="text-slate-500">CPF: 123.456.789-00 • 28 anos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Imprimir Prontuário
          </button>
          <button 
            onClick={handleFinish}
            className="flex-1 md:flex-none px-4 py-2 bg-cyan-600 rounded-xl text-sm font-medium text-white hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-200"
          >
            Finalizar Atendimento
          </button>
        </div>
      </header>

      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeSubTab === tab.id 
                ? "bg-cyan-50 text-cyan-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeSubTab === 'evolucao' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Nova Evolução</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsRecording(!isRecording)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      isRecording 
                        ? "bg-red-50 text-red-600 animate-pulse" 
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Mic className="w-4 h-4" />
                    {isRecording ? 'Gravando...' : 'Gravar Áudio'}
                  </button>
                  <button className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100">
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <textarea 
                placeholder="Descreva a evolução do paciente... (A IA formatará automaticamente se usar áudio)"
                className="w-full min-h-[300px] p-6 bg-slate-50 border-none rounded-2xl text-slate-700 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none resize-none"
              />

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FileText className="w-4 h-4" />
                  Última alteração: Hoje às 14:20 por Dr. Lucas
                </div>
                <button className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all">
                  Salvar Evolução
                </button>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'odontograma' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-slate-900">Odontograma Digital</h2>
                <p className="text-sm text-slate-500">Selecione os dentes para registrar procedimentos ou observações.</p>
              </div>
              
              <div className="grid grid-cols-8 gap-2 md:gap-4 max-w-2xl mx-auto">
                {Array.from({ length: 16 }).map((_, i) => {
                  const toothNum = 18 - i > 10 ? 18 - i : 20 + (i - 7);
                  return (
                    <div 
                      key={toothNum} 
                      onClick={() => handleToothClick(toothNum)}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className={cn(
                        "text-[10px] font-bold",
                        teethStatus[toothNum] ? "text-cyan-600" : "text-slate-400"
                      )}>
                        {toothNum}
                      </span>
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 border border-slate-300 rounded-lg transition-all cursor-pointer hover:border-cyan-400",
                        getToothColor(toothNum)
                      )} />
                    </div>
                  );
                })}
                <div className="col-span-8 h-8 flex items-center justify-center">
                  <div className="w-full h-px bg-slate-100" />
                </div>
                {Array.from({ length: 16 }).map((_, i) => {
                  const toothNum = 48 - i > 40 ? 48 - i : 30 + (i - 7);
                  return (
                    <div 
                      key={toothNum} 
                      onClick={() => handleToothClick(toothNum)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 border border-slate-300 rounded-lg transition-all cursor-pointer hover:border-cyan-400",
                        getToothColor(toothNum)
                      )} />
                      <span className={cn(
                        "text-[10px] font-bold",
                        teethStatus[toothNum] ? "text-cyan-600" : "text-slate-400"
                      )}>
                        {toothNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Cárie', 'Restauração', 'Canal', 'Extraído'].map(label => (
                  <button 
                    key={label} 
                    onClick={() => setSelectedProcedure(label)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border transition-all",
                      selectedProcedure === label 
                        ? "bg-cyan-50 border-cyan-200 shadow-sm" 
                        : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      label === 'Cárie' ? "bg-red-500" :
                      label === 'Restauração' ? "bg-blue-500" :
                      label === 'Canal' ? "bg-amber-500" : "bg-slate-900"
                    )} />
                    <span className="text-xs font-bold text-slate-600">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'estoque' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Consumo de Materiais</h2>
                <button 
                  onClick={() => setIsAddingItem(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </button>
              </div>

              <AnimatePresence>
                {isAddingItem && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex gap-2">
                      <input 
                        type="text" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Nome do material..."
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/20"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                      />
                      <button 
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl text-sm"
                      >
                        Adicionar
                      </button>
                      <button 
                        onClick={() => setIsAddingItem(false)}
                        className="p-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="space-y-4">
                {consumptionItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-400 hover:text-cyan-600"
                        >-</button>
                        <span className="text-sm font-bold text-slate-900 w-4 text-center">{item.qty}</span>
                        <button 
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-400 hover:text-cyan-600"
                        >+</button>
                      </div>
                      <span className="text-xs text-slate-500">{item.unit}</span>
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600"
                      ><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => triggerSuccess('Itens abatidos do estoque com sucesso!')}
                  className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all"
                >
                  Confirmar Consumo
                </button>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'fotos' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-cyan-300 hover:text-cyan-500 transition-all cursor-pointer">
                <Plus className="w-8 h-8" />
                <span className="text-xs font-bold">Adicionar Foto</span>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-slate-200 rounded-3xl overflow-hidden relative group">
                  <img 
                    src={`https://picsum.photos/seed/dental-${i}/400/400`} 
                    alt="Dental record" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-lg text-slate-900"><Camera className="w-4 h-4" /></button>
                    <button className="p-2 bg-white rounded-lg text-slate-900"><FileText className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Resumo Clínico</h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Alergias</p>
                <p className="text-sm text-amber-900 font-medium">Penicilina, Corantes</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100">
                <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-1">Tratamento Atual</p>
                <p className="text-sm text-cyan-900 font-medium">Ortodontia Invisível (Alinhadores)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Histórico Recente</h3>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Ajuste de Alinhadores</p>
                    <p className="text-xs text-slate-500">12 de Fev, 2026</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
