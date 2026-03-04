import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  DollarSign, 
  Sparkles, 
  Settings, 
  LogOut,
  ChevronRight,
  X,
  Building2,
  ShieldCheck,
  CreditCard,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const clinicMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'prontuarios', label: 'Prontuários', icon: FileText },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'marketing', label: 'Marketing & IA', icon: Sparkles },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const adminMenuItems = [
  { id: 'admin-dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'admin-clinicas', label: 'Gerenciar Clínicas', icon: Building2 },
  { id: 'admin-assinaturas', label: 'Assinaturas', icon: CreditCard },
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
    estoque: 'manage_stock',
    marketing: 'view_dashboard',
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
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50",
        isMobile 
          ? cn("fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out w-64", isOpen ? "translate-x-0" : "-translate-x-full")
          : cn("h-screen relative", isOpen ? "w-64" : "w-20")
      )}>
        <div className="p-6 flex items-center justify-between">
          {(isOpen || !isMobile) && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">L</div>
              {(isOpen || !isMobile) && <span className="font-bold text-xl tracking-tight text-slate-900">LuminaFlow</span>}
            </div>
          )}
          {isMobile && (
            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-cyan-50 text-cyan-600 font-medium" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-cyan-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {(isOpen || !isMobile) && <span>{item.label}</span>}
              {(isOpen || !isMobile) && activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl",
            (isOpen || !isMobile) ? "bg-slate-50" : "justify-center"
          )}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
            {(isOpen || !isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.role === 'super_admin' ? 'Administrador Lumina' : clinic?.name}</p>
              </div>
            )}
          </div>
          <button 
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200",
              (!isOpen && !isMobile) && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {(isOpen || !isMobile) && <span>Sair</span>}
          </button>
        </div>
        
        {!isMobile && (
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm"
          >
            {isOpen ? <ChevronRight className="w-3 h-3 rotate-180" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
      </aside>
    </>
  );
}
