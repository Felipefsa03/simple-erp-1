import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Filter, 
  Download,
  CreditCard,
  PieChart,
  Calendar,
  X,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const transactions = [
  { id: 99, type: 'income', category: 'Atendimento', description: 'Ana Paula Souza - Finalizado agora', value: 'R$ 350,00', date: 'Agora', status: 'awaiting_payment', items: ['Kit Clínico', 'Resina Z350', 'Anestésico'] },
  { id: 1, type: 'income', category: 'Procedimento', description: 'Ana Paula Souza - Alinhadores', value: 'R$ 1.200,00', date: 'Hoje', status: 'paid' },
  { id: 2, type: 'expense', category: 'Material', description: 'Dental Cremer - Resinas', value: 'R$ 450,00', date: 'Hoje', status: 'paid' },
  { id: 3, type: 'income', category: 'Procedimento', description: 'Carlos Eduardo - Avaliação', value: 'R$ 150,00', date: 'Ontem', status: 'pending' },
  { id: 4, type: 'expense', category: 'Aluguel', description: 'Condomínio Ed. Medical', value: 'R$ 2.800,00', date: '05/02', status: 'paid' },
  { id: 5, type: 'income', category: 'Procedimento', description: 'Juliana Mendes - Botox', value: 'R$ 1.800,00', date: '04/02', status: 'paid' },
];

export function Financeiro() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [transactionList, setTransactionList] = React.useState(transactions);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleProcessPayment = (id: number) => {
    setTransactionList(prev => prev.map(t => 
      t.id === id ? { ...t, status: 'paid' } : t
    ));
    triggerSuccess('Pagamento processado e estoque baixado!');
  };

  const handleExportDRE = () => {
    triggerSuccess('Relatório DRE exportado com sucesso!');
    // Simulate real download
    const link = document.createElement('a');
    link.href = '#';
    link.download = 'DRE-LuminaFlow.pdf';
    link.click();
  };

  const handleConfigureGateway = () => {
    triggerSuccess('Redirecionando para configuração Asaas...');
    setTimeout(() => {
      window.open('https://www.asaas.com/customer/config', '_blank');
    }, 1000);
  };

  return (
    <div className="space-y-8 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Controle seu fluxo de caixa e faturamento em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportDRE}
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar DRE
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2 bg-cyan-600 rounded-xl text-sm font-medium text-white hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-200"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Novo Lançamento
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Novo Lançamento</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button className="py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl border-2 border-emerald-200">Receita</button>
                  <button className="py-3 bg-red-50 text-red-700 font-bold rounded-xl border-2 border-transparent opacity-50">Despesa</button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente (Opcional)</label>
                  <input type="text" placeholder="Buscar paciente cadastrado..." className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</label>
                  <input type="text" placeholder="Ex: Pagamento Ana Paula" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
                  <input type="text" placeholder="0,00" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    triggerSuccess('Lançamento registrado com sucesso!');
                  }}
                  className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+15%</span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Receita Mensal</p>
          <p className="text-2xl font-bold text-slate-900">R$ 42.500,00</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">+5%</span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Despesas Mensais</p>
          <p className="text-2xl font-bold text-slate-900">R$ 18.200,00</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/10 text-white rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-1">Saldo em Caixa</p>
          <p className="text-2xl font-bold text-white">R$ 24.300,00</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Últimas Transações</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => triggerSuccess('Filtros de transações ativados')}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600"
              ><Filter className="w-4 h-4" /></button>
              <button 
                onClick={() => triggerSuccess('Seletor de data ativado')}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600"
              ><Calendar className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {transactionList.map((t, i) => (
                <React.Fragment key={t.id}>
                  <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{t.description}</p>
                    <p className="text-xs text-slate-500">{t.category} • {t.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      t.type === 'income' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {t.type === 'income' ? '+' : '-'} {t.value}
                    </p>
                    <button 
                      onClick={() => t.status === 'awaiting_payment' && handleProcessPayment(t.id)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-all",
                        t.status === 'paid' ? "bg-emerald-50 text-emerald-600" : 
                        t.status === 'awaiting_payment' ? "bg-cyan-50 text-cyan-600 animate-pulse hover:bg-cyan-100 cursor-pointer" :
                        "bg-amber-50 text-amber-600"
                      )}
                    >
                      {t.status === 'paid' ? 'Pago' : 
                       t.status === 'awaiting_payment' ? 'Aguardando Pagamento' : 'Pendente'}
                    </button>
                  </div>
                </div>
                {t.status === 'awaiting_payment' && (
                  <div className="px-4 pb-4 pt-0 flex flex-wrap gap-2">
                    {t.items?.map(item => (
                      <span key={item} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                        {item}
                      </span>
                    ))}
                    <button 
                      onClick={() => handleProcessPayment(t.id)}
                      className="ml-auto text-[10px] font-bold text-white bg-cyan-600 px-3 py-1 rounded-lg hover:bg-cyan-700 transition-all"
                    >
                      Receber Agora
                    </button>
                  </div>
                )}
              </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-cyan-500" />
              Distribuição de Gastos
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Materiais', value: '35%', color: 'bg-cyan-500' },
                { label: 'Aluguel/Contas', value: '25%', color: 'bg-blue-500' },
                { label: 'Marketing', value: '20%', color: 'bg-indigo-500' },
                { label: 'Outros', value: '20%', color: 'bg-slate-300' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500 uppercase">{item.label}</span>
                    <span className="text-slate-900">{item.value}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color)} style={{ width: item.value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-cyan-200/50">
            <CreditCard className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="font-bold text-lg mb-1">Integração Asaas</h3>
            <p className="text-sm text-cyan-100 mb-4">Gere cobranças automáticas via Pix e Cartão com um clique.</p>
            <button 
              onClick={handleConfigureGateway}
              className="w-full py-2 bg-white text-cyan-700 font-bold rounded-xl hover:bg-cyan-50 transition-colors"
            >
              Configurar Gateway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
