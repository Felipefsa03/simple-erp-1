import React from 'react'
import { Link } from 'react-router-dom'
import './globals.css'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  DollarSign, 
  Sparkles, 
  Settings,
  Package
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/prontuarios', label: 'Prontuários', icon: FileText },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/marketing', label: 'Marketing', icon: Sparkles },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head />
      <body className="bg-slate-50 antialiased">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-slate-900">Clinxia</span>
                  <span className="text-xs text-slate-400">Gestão Inteligente</span>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile Menu Button - Placeholder */}
              <button className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-50">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </body>
    </html>
  )
}
