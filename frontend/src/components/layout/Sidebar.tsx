import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  DollarSign, 
  Sparkles, 
  Settings, 
  LogOut,
  ChevronRight,
  X,
  Building2,
  ShieldCheck,
  CreditCard,
  Package,
  Stethoscope,
  Shield,
  Link2,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'motion/react';

const clinicMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'prontuarios', label: 'Prontuários', icon: Stethoscope },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'insurance', label: 'Convênios', icon: Shield },
  { id: 'branches', label: 'Filiais', icon: Building2 },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'marketing', label: 'Marketing & IA', icon: Sparkles },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const adminMenuItems = [
  { id: 'admin-dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'admin-clinicas', label: 'Gerenciar Clínicas', icon: Building2 },
  { id: 'admin-assinaturas', label: 'Assinaturas', icon: CreditCard },
  { id: 'admin-sistema', label: 'Sistema', icon: Server },
  { id: 'admin-seguranca', label: 'Segurança', icon: ShieldCheck },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
}

export function Sidebar({ activeTab, onTabChange, isOpen, setIsOpen, isMobile }: SidebarProps) {
  const { user, clinic, logout, hasPermission } = useAuth();
  
  const permissionByTab: Record<string, string | null> = {
    dashboard: 'view_dashboard',
    agenda: 'create_appointment',
    pacientes: 'view_patients',
    prontuarios: 'view_patients',
    financeiro: 'view_financial',
    insurance: 'view_patients',
    branches: 'manage_settings',
    estoque: 'manage_stock',
    marketing: 'view_dashboard',
    'testes-whatsapp': null,
    configuracoes: 'manage_settings',
  };

  const baseItems = user?.role === 'super_admin' ? adminMenuItems : clinicMenuItems;
  const menuItems = baseItems.filter(item => {
    const perm = permissionByTab[item.id];
    if (!perm) return true;
    return hasPermission(perm);
  });

  const handleTabClick = (id: string) => {
    onTabChange(id);
    if (isMobile) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <motion.aside 
        initial={false}
        animate={{ 
          x: isMobile ? (isOpen ? 0 : -280) : 0,
          width: isMobile ? 280 : (isOpen ? 256 : 80)
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "bg-white border-r border-slate-100 flex flex-col z-50 shadow-xl",
          isMobile ? "fixed inset-y-0 left-0" : "relative h-screen"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            {(isOpen || !isMobile) && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-slate-900">LuminaFlow</span>
                <span className="text-xs text-slate-400">Gestão Inteligente</span>
              </div>
            )}
          </div>
          {isMobile && (
            <button 
              onClick={() => setIsOpen(false)} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-gradient-to-r from-brand-50 to-brand-100/50 text-brand-700 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg transition-all duration-200",
                activeTab === item.id 
                  ? "bg-brand-500 text-white shadow-md" 
                  : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              {(isOpen || !isMobile) && (
                <>
                  <span className="font-medium text-sm">{item.label}</span>
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="ml-auto"
                    >
                      <ChevronRight className="w-4 h-4 text-brand-500" />
                    </motion.div>
                  )}
                </>
              )}
            </motion.button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-slate-100">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50",
            (isOpen || !isMobile) ? "bg-slate-50" : "justify-center p-2"
          )}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-500 flex items-center justify-center text-white font-semibold shadow-md shadow-accent-500/20">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {(isOpen || !isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.role === 'super_admin' ? 'Administrador' : clinic?.name || 'Clínica'}
                </p>
              </div>
            )}
          </div>
          <motion.button 
            onClick={logout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 mt-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200",
              (!isOpen && !isMobile) && "justify-center"
            )}
          >
            <div className="p-2 rounded-lg bg-red-50 text-red-500">
              <LogOut className="w-4 h-4" />
            </div>
            {(isOpen || !isMobile) && <span className="font-medium text-sm">Sair</span>}
          </motion.button>
        </div>
        
        {/* Toggle Button */}
        {!isMobile && (
          <motion.button 
            onClick={() => setIsOpen(!isOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute -right-3 top-24 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-brand-500 shadow-md hover:shadow-lg transition-all"
          >
            <ChevronRight className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
          </motion.button>
        )}
      </motion.aside>
    </>
  );
}
