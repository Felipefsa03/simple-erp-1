import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'motion/react';
import {
  Sparkles, ArrowRight, CheckCircle2, Calendar, FileText, DollarSign,
  Users, Shield, MessageSquare, Menu, X, PlayCircle, ChevronDown,
  Package, BarChart3, Zap, Star, Clock, TrendingUp, Heart,
  Phone, Mail, Globe, Smartphone, Monitor, Check, ArrowUpRight,
  Quote, Building2, Stethoscope, Activity, CreditCard, Bell, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gzcimnredlffqyogxzqq.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const GLOBAL_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignupClick?: () => void;
}

// Animated Counter
function AnimatedCounter({ end, duration = 2, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Typewriter
function Typewriter({ texts, speed = 100 }: { texts: string[]; speed?: number }) {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[index];
    const timeout = setTimeout(() => {
      if (!deleting) {
        if (charIndex < current.length) {
          setText(current.slice(0, charIndex + 1));
          setCharIndex(c => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 2500);
        }
      } else {
        if (charIndex > 0) {
          setText(current.slice(0, charIndex - 1));
          setCharIndex(c => c - 1);
        } else {
          setDeleting(false);
          setIndex((index + 1) % texts.length);
        }
      }
    }, deleting ? speed / 3 : speed);
    return () => clearTimeout(timeout);
  }, [charIndex, deleting, index, texts, speed]);

  return (
    <span className="text-brand-600">
      {text}
      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.4, repeat: Infinity }} className="text-brand-500">|</motion.span>
    </span>
  );
}

// 3D Rotating Dashboard - Versão Corrigida
function Dashboard3D() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Normalizar posição do mouse de -1 a 1
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Limitar rotação para não ficar torto
  const rotateX = mousePos.y * -8; // Máximo 8 graus
  const rotateY = mousePos.x * 8;  // Máximo 8 graus

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto" style={{ perspective: '1000px' }}>
      {/* Container principal com rotação limitada */}
      <motion.div
        animate={{
          rotateX: rotateX,
          rotateY: rotateY,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 0.8 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {/* Main Dashboard Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/80 p-6 border border-slate-100 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-slate-500">Bem-vindo de volta</p>
              <p className="text-xl font-bold text-slate-800">Dr. Lucas Silva</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/20">
              L
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-brand-50 to-brand-50 rounded-xl p-4"
            >
              <p className="text-xs text-brand-600 font-medium">Agendamentos Hoje</p>
              <p className="text-2xl font-bold text-slate-800">12</p>
              <p className="text-xs text-accent-600 mt-1">+3 que ontem</p>
            </motion.div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-accent-50 to-accent-50 rounded-xl p-4"
            >
              <p className="text-xs text-accent-600 font-medium">Receita do Mês</p>
              <p className="text-2xl font-bold text-slate-800">R$ 45k</p>
              <p className="text-xs text-accent-600 mt-1">+12% vs mês anterior</p>
            </motion.div>
          </div>

          <div className="space-y-3">
            {[
              { time: '09:00', name: 'João Silva', status: 'Confirmado', color: 'bg-accent-500', textColor: 'text-accent-600' },
              { time: '10:30', name: 'Maria Santos', status: 'Confirmado', color: 'bg-brand-500', textColor: 'text-brand-600' },
              { time: '14:00', name: 'Pedro Costa', status: 'Pendente', color: 'bg-brand-500', textColor: 'text-brand-600' },
            ].map((apt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", apt.color)} />
                  <span className="text-sm font-medium text-slate-600">{apt.time}</span>
                  <span className="text-sm text-slate-800 font-medium">{apt.name}</span>
                </div>
                <span className={cn("text-xs font-medium", apt.textColor)}>{apt.status}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Floating Cards - Posicionados FORA do objeto 3D principal */}
        <div className="absolute -top-6 -right-6 z-20">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-3 border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-accent-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Confirmado via</p>
                <p className="text-xs font-bold text-slate-800">WhatsApp</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute -bottom-4 -left-4 z-20">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-3 border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Pix recebido</p>
                <p className="text-xs font-bold text-accent-600">+ R$ 350</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/3 -right-10 z-20">
          <motion.div
            animate={{ y: [0, -6, 0], x: [0, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-3 border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-accent-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Lembrete</p>
                <p className="text-xs font-bold text-slate-800">Em 30 min</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Glow effect behind dashboard */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-brand-200/30 to-brand-200/30 rounded-full blur-3xl -z-10" />
    </div>
  );
}

// Feature Card 3D
function FeatureCard3D({ icon: Icon, title, description, color, delay }: {
  icon: React.ElementType; title: string; description: string; color: string; delay: number;
}) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateY(x * 20);
    setRotateX(-y * 20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${isHovered ? 'translateZ(20px)' : ''}`,
      }}
      className="relative group cursor-pointer"
    >
      <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 h-full">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", color)}>
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{description}</p>

        {/* Shine effect on hover */}
        <div className={cn(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          "bg-gradient-to-br from-white/50 via-transparent to-transparent"
        )} />
      </div>
    </motion.div>
  );
}

// Section Wrapper
function Section({ children, className, id, bg = 'white' }: {
  children: React.ReactNode; className?: string; id?: string; bg?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.8 }}
      className={cn("relative", bg === 'gray' ? 'bg-slate-50' : 'bg-white', className)}
    >
      {children}
    </motion.section>
  );
}

// Gradient Text
function GradientText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-brand-500 to-accent-500", className)}>
      {children}
    </span>
  );
}

export function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [planPrices, setPlanPrices] = useState<{ basico: number; profissional: number; premium: number }>({
    basico: 97,
    profissional: 197,
    premium: 397
  });
  const [loadingPrices, setLoadingPrices] = useState(true);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    (async () => {
      try {
        if (SUPABASE_KEY) {
          const supabaseResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.${GLOBAL_CLINIC_ID}&select=plan_price_basico,plan_price_profissional,plan_price_premium&limit=1`,
            {
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
            }
          );
          if (supabaseResponse.ok) {
            const rows = await supabaseResponse.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const row = rows[0];
              const basico = Number(row.plan_price_basico);
              const profissional = Number(row.plan_price_profissional);
              const premium = Number(row.plan_price_premium);
              if (basico > 0 && profissional > 0 && premium > 0) {
                setPlanPrices({ basico, profissional, premium });
                return;
              }
            }
          }
        }

        const response = await fetch(`${API_BASE}/api/system/signup-config`);
        const data = await response.json();
        if (data?.ok && data?.plan_prices) {
          const basico = Number(data.plan_prices.basico);
          const profissional = Number(data.plan_prices.profissional);
          const premium = Number(data.plan_prices.premium);
          if (!(basico > 0 && profissional > 0 && premium > 0)) {
            throw new Error('Dados de preço inválidos no fallback API');
          }
          setPlanPrices({
            basico,
            profissional,
            premium
          });
        }
      } catch (_error) {
        console.log('Using default prices');
      } finally {
        setLoadingPrices(false);
      }
    })();
  }, []);

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const features = [
    { icon: Calendar, title: 'Agenda Inteligente', description: 'Gestão de horários com confirmação automática via WhatsApp. Reduza faltas em até 40%.', color: 'bg-brand-50 text-brand-600' },
    { icon: FileText, title: 'Prontuário Digital', description: 'Odontograma interativo, anamnese completa e evolução clínica com assinatura digital.', color: 'bg-accent-50 text-accent-600' },
    { icon: CreditCard, title: 'Financeiro Completo', description: 'Pix, cartão e boleto integrados. DRE e fluxo de caixa em tempo real.', color: 'bg-brand-50 text-brand-600' },
    { icon: Package, title: 'Controle de Estoque', description: 'Gestão de materiais com alertas automáticos de reposição e consumo por procedimento.', color: 'bg-accent-50 text-accent-600' },
    { icon: MessageSquare, title: 'WhatsApp Business', description: 'Lembretes, confirmações e campanhas de marketing direto pelo WhatsApp.', color: 'bg-accent-50 text-accent-600' },
    { icon: BarChart3, title: 'Relatórios Inteligentes', description: 'Dashboards com métricas em tempo real. Saiba exatamente como está seu negócio.', color: 'bg-accent-50 text-accent-600' },
  ];

  const stats = [
    { value: 500, suffix: '+', label: 'Clínicas Ativas' },
    { value: 50, suffix: 'K+', label: 'Pacientes Atendidos' },
    { value: 98, suffix: '%', label: 'Satisfação' },
    { value: 40, suffix: '%', label: 'Menos Faltas' },
  ];

  const plans = [
    {
      name: 'Básico',
      price: planPrices.basico,
      description: 'Ideal para clínicas iniciantes',
      features: ['1 profissional', 'Agenda inteligente', 'Prontuário digital', 'WhatsApp integrado', 'Suporte por email'],
      highlighted: false,
    },
    {
      name: 'Profissional',
      price: planPrices.profissional,
      description: 'O mais popular',
      features: ['5 profissionais', 'Agenda avançada', 'Prontuário completo', 'Financeiro integrado', 'WhatsApp Business', 'Relatórios completos', 'Suporte prioritário'],
      highlighted: true,
    },
    {
      name: 'Premium',
      price: planPrices.premium,
      description: 'Para grandes clínicas',
      features: ['Profissionais ilimitados', 'Tudo do Profissional', 'API personalizada', 'Treinamento incluso', 'Suporte 24/7', 'Consultoria dedicada'],
      highlighted: false,
    },
  ];

  const testimonials = [
    {
      name: 'Dra. Carolina Mendes',
      role: 'Odontologia - São Paulo',
      text: 'Reduzi em 40% as faltas com os lembretes automáticos. O sistema pagou por si só no primeiro mês de uso.',
      rating: 5,
    },
    {
      name: 'Dr. Roberto Santos',
      role: 'Estética - Rio de Janeiro',
      text: 'O financeiro integrado acabou com minhas planilhas. Agora vejo tudo em tempo real e meu faturamento aumentou 25%.',
      rating: 5,
    },
    {
      name: 'Dra. Júlia Paiva',
      role: 'Odontopediatria - BH',
      text: 'Os pais adoram receber as confirmações pelo WhatsApp. O sistema é muito intuitivo e fácil de usar.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden">

      {/* Navbar */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo variant="full" size="md" />
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
            <a href="#features" className="hover:text-brand-600 transition-colors relative group">
              Funcionalidades
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 group-hover:w-full transition-all" />
            </a>
            <a href="#pricing" className="hover:text-brand-600 transition-colors relative group">
              Planos
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 group-hover:w-full transition-all" />
            </a>
            <a href="#testimonials" className="hover:text-brand-600 transition-colors relative group">
              Depoimentos
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 group-hover:w-full transition-all" />
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Entrar
            </Link>
            <Link
              to="/signup/trial"
              className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-brand-500/25 transition-all"
            >
              Teste Grátis
            </Link>
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                <a href="#features" className="block text-slate-700 hover:text-brand-600 font-medium">Funcionalidades</a>
                <a href="#pricing" className="block text-slate-700 hover:text-brand-600 font-medium">Planos</a>
                <a href="#testimonials" className="block text-slate-700 hover:text-brand-600 font-medium">Depoimentos</a>
                <a href="/api" className="block text-slate-700 hover:text-brand-600 font-medium">API</a>
                <a href="/sobre" className="block text-slate-700 hover:text-brand-600 font-medium">Sobre</a>
                <a href="/blog" className="block text-slate-700 hover:text-brand-600 font-medium">Blog</a>
                <a href="/carreiras" className="block text-slate-700 hover:text-brand-600 font-medium">Carreiras</a>
                <a href="/contato" className="block text-slate-700 hover:text-brand-600 font-medium">Contato</a>
                <a href="/termos" className="block text-slate-700 hover:text-brand-600 font-medium">Termos de Uso</a>
                <a href="/privacidade" className="block text-slate-700 hover:text-brand-600 font-medium">Privacidade</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-brand-100/50 to-brand-100/50 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-accent-100/30 to-accent-100/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-brand-400 rounded-full opacity-40" />
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-brand-400 rounded-full opacity-30" />
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-accent-400 rounded-full opacity-40" />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              {/* Badge removido conforme solicitado */}

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight text-slate-900 mb-6"
              >
                Sua clínica<br />
                <Typewriter texts={['crescendo rápido.', 'sem complicação.', 'com inteligência.', 'lucrando mais.']} />
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-slate-500 max-w-lg mb-8 leading-relaxed"
              >
                O sistema completo que <strong className="text-slate-700">substitui planilhas, WhatsApp manual e ferramentas separadas</strong>.
                Tudo em um lugar só. Configuração em 24 horas.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <button
                  onClick={() => window.location.href = '/signup/trial'}
                  className="group px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Começar Teste Grátis de 7 Dias
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-8 py-4 bg-slate-100 text-slate-700 font-semibold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Ver Demo de 2 min
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-500" />
                  Dados protegidos (LGPD)
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-500" />
                  7 dias grátis
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  Sem cartão de crédito
                </div>
              </motion.div>

              {/* Social Proof - Quem se cadastrou recentemente */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 flex items-center gap-3"
              >
                <div className="flex -space-x-2">
                  {['C', 'R', 'J', 'A'].map((letter, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      style={{ zIndex: 4 - i }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  <strong className="text-slate-700">+23 clínicas</strong> se cadastraram esta semana
                </p>
              </motion.div>
            </div>

            {/* Right: 3D Dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="hidden lg:block"
            >
              <Dashboard3D />
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="w-6 h-6 text-slate-300" />
          </motion.div>
        </motion.div>
      </section>

      {/* Why Choose Us - Seção Persuasiva */}
      <Section className="py-20" bg="gray">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-brand-600 font-semibold text-sm uppercase tracking-wider mb-4"
            >
              Por que escolher o Clinxia?
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-extrabold text-slate-900"
            >
              Mais de 500 clínicas já confiam em nós
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: 'Implementação em 24h',
                description: 'Sua clínica funcionando em menos de 1 dia',
                color: 'bg-brand-500',
              },
              {
                icon: Shield,
                title: 'Dados 100% seguros',
                description: 'Conformidade total com a LGPD',
                color: 'bg-accent-500',
              },
              {
                icon: Heart,
                title: 'Suporte humanizado',
                description: 'Equipe dedicada para sua clínica',
                color: 'bg-rose-500',
              },
              {
                icon: TrendingUp,
                title: 'Resultados comprovados',
                description: '40% menos faltas, 25% mais faturamento',
                color: 'bg-brand-500',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", item.color)}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Trusted By */}
      <Section className="py-16 border-y border-slate-100" bg="gray">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-400 mb-8">UTILIZADO POR CLÍNICAS EM TODO O BRASIL</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40">
            {['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'].map(city => (
              <span key={city} className="text-lg font-bold text-slate-400">{city}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* Features Section */}
      <Section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-brand-600 font-semibold text-sm uppercase tracking-wider mb-4"
            >
              Funcionalidades
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4"
            >
              Tudo que sua clínica <GradientText>precisa</GradientText>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-500 max-w-2xl mx-auto"
            >
              Um sistema completo que substitui todas as suas ferramentas separadas
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard3D key={feature.title} {...feature} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </Section>

      {/* Dashboard Preview */}
      <Section className="py-24" bg="gray">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <p className="text-brand-600 font-semibold text-sm uppercase tracking-wider mb-4">Dashboard</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6">
                Controle total na <GradientText>palma da mão</GradientText>
              </h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                Veja todas as métricas importantes do seu negócio em um único lugar.
                Acompanhe agendamentos, faturamento, comissões e muito mais em tempo real.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Activity, text: 'Métricas em tempo real' },
                  { icon: TrendingUp, text: 'Análise de crescimento' },
                  { icon: Users, text: 'Gestão de equipe' },
                  { icon: DollarSign, text: 'Controle financeiro' },
                ].map((item, i) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-brand-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              style={{ perspective: '1000px' }}
            >
              <motion.div
                whileHover={{ rotateY: -5, rotateX: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 p-8 border border-slate-100"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-accent-400" />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Agendamentos', value: '127', change: '+12%', color: 'text-accent-600' },
                    { label: 'Receita', value: 'R$ 45k', change: '+8%', color: 'text-accent-600' },
                    { label: 'Pacientes', value: '342', change: '+15%', color: 'text-accent-600' },
                  ].map((stat, i) => (
                    <div key={stat.label} className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                      <p className={cn("text-xs font-medium", stat.color)}>{stat.change}</p>
                    </div>
                  ))}
                </div>

                <div className="h-32 bg-gradient-to-r from-brand-50 to-brand-50 rounded-xl flex items-end p-4 gap-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ delay: 0.1 * i, duration: 0.5 }}
                      className="flex-1 bg-gradient-to-t from-brand-500 to-brand-500 rounded-t-md"
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Stats Section */}
      <Section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600 mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-slate-500 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Pricing Section */}
      <Section id="pricing" className="py-24" bg="gray">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-wider mb-4">Planos</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
              Escolha o plano <GradientText>ideal</GradientText>
            </h2>
            <p className="text-lg text-slate-500">Comece grátis por 7 dias. Cancele quando quiser.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loadingPrices ? (
              <div className="col-span-3 flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="ml-3 text-slate-500">Carregando preços...</span>
              </div>
            ) : plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className={cn(
                  "relative bg-white rounded-3xl p-8 border transition-all",
                  plan.highlighted
                    ? "border-brand-200 shadow-xl shadow-brand-500/10 scale-105"
                    : "border-slate-200 shadow-lg"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold rounded-full">
                    MAIS POPULAR
                  </div>
                )}

                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-slate-500 mb-6">{plan.description}</p>

                <div className="mb-6">
                  {plan.price ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-slate-400">R$</span>
                      <span className="text-5xl font-extrabold text-slate-900">{plan.price}</span>
                      <span className="text-slate-400">/mês</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-brand-600">Sob consulta</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-slate-600">
                      <Check className="w-5 h-5 text-brand-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => plan.price ? window.location.href = '/signup/trial' : window.location.href = '/contato'}
                  className={cn(
                    "w-full py-4 rounded-xl font-semibold transition-all",
                    plan.highlighted
                      ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/20"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {plan.price ? 'Começar Teste Grátis' : 'Falar com Consultor'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section id="testimonials" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-wider mb-4">Depoimentos</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
              O que dizem nossos <GradientText>clientes</GradientText>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100"
              >
                <Quote className="w-8 h-8 text-brand-200 mb-4" />
                <p className="text-slate-600 mb-6 leading-relaxed">{t.text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-500 rounded-full flex items-center justify-center text-white font-bold">
                    {t.name.charAt(4)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-brand-400 text-brand-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section className="py-24" bg="gray">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-accent-600 rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-32 h-32 border border-white rounded-full"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-extrabold text-white mb-4"
              >
                Pronto para transformar sua clínica?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-white/80 mb-8"
              >
                Comece hoje mesmo com 7 dias grátis. Sem cartão de crédito.
              </motion.p>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => window.location.href = '/signup/trial'}
                className="group px-10 py-5 bg-white text-brand-600 text-lg font-bold rounded-2xl hover:shadow-2xl transition-all inline-flex items-center gap-3"
              >
                Começar Teste Grátis
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </motion.button>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center mb-4">
                <Logo variant="white" size="lg" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                O sistema de gestão mais completo para clínicas de odontologia e estética do Brasil.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Produto</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-brand-400 transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-brand-400 transition-colors">Planos</a></li>
                <li><a href="/carreiras" className="hover:text-brand-400 transition-colors">Carreiras</a></li>
                <li><a href="/api" className="hover:text-brand-400 transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Empresa</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="/sobre" className="hover:text-brand-400 transition-colors">Sobre</a></li>
                <li><a href="/blog" className="hover:text-brand-400 transition-colors">Blog</a></li>
                <li><a href="/carreiras" className="hover:text-brand-400 transition-colors">Carreiras</a></li>
                <li><a href="/contato" className="hover:text-brand-400 transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Legal</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="/termos" className="hover:text-brand-400 transition-colors">Termos de Uso</a></li>
                <li><a href="/privacidade" className="hover:text-brand-400 transition-colors">Privacidade</a></li>
                <li><a href="/lgpd" className="hover:text-brand-400 transition-colors">LGPD</a></li>
                <li><a href="/cookies" className="hover:text-brand-400 transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">© 2026 Clinxia. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <Link to="/" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Globe className="w-5 h-5 text-slate-400" />
              </Link>
              <a href="https://wa.me/557591517196" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <MessageSquare className="w-5 h-5 text-slate-400" />
              </a>
              <a href="mailto:contato.clinxia@gmail.com" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Mail className="w-5 h-5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
