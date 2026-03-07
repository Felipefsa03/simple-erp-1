// ============================================
// LuminaFlow — Shared UI Components
// ============================================
import React, { useState, useEffect, useCallback, type ComponentPropsWithoutRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToastMsg } from '@/hooks/useShared';
import { registerToastCallback } from '@/hooks/useShared';

// ---- Toast Provider ----
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);

    useEffect(() => {
        registerToastCallback((msg) => {
            setToasts(prev => [...prev, msg]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== msg.id));
            }, 3500);
        });
    }, []);

    const iconMap = {
        success: CheckCircle2,
        error: XCircle,
        warning: AlertTriangle,
        info: Info,
    };
    const colorMap = {
        success: 'bg-emerald-600',
        error: 'bg-red-600',
        warning: 'bg-amber-600',
        info: 'bg-blue-600',
    };

    return (
        <>
            {children}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] space-y-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => {
                        const Icon = iconMap[t.type];
                        return (
                            <motion.div
                                key={t.id}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                className={cn(
                                    "pointer-events-auto px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2 text-white text-sm",
                                    colorMap[t.type]
                                )}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {t.message}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </>
    );
}

// ---- Loading Button ----
type LoadingButtonProps = ComponentPropsWithoutRef<'button'> & {
    loading?: boolean;
};

export function LoadingButton({ loading, children, className, disabled, ...props }: LoadingButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={cn(
                "relative transition-all",
                loading && "opacity-80 cursor-not-allowed",
                className
            )}
        >
            {loading && (
                <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
            <span className={cn(loading && "invisible")}>{children}</span>
        </button>
    );
}

// ---- Confirm Dialog ----
interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', variant = 'primary' }: ConfirmDialogProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
                <div className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500">{message}</p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={cn(
                                "flex-1 py-2.5 font-bold rounded-xl transition-all text-sm text-white",
                                variant === 'danger' ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700"
                            )}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ---- Empty State ----
interface EmptyStateProps {
    icon?: React.ElementType;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = Package, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-400 mb-1">{title}</h3>
            {description && <p className="text-sm text-slate-400 max-w-sm">{description}</p>}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700 transition-all"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

// ---- Drawer ----
interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export function Drawer({ isOpen, onClose, title, children, width = 'max-w-md' }: DrawerProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                        className={cn("fixed right-0 top-0 bottom-0 bg-white shadow-2xl z-50 flex flex-col w-full", width)}
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ---- Modal ----
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn("bg-white rounded-3xl shadow-2xl w-full overflow-hidden", maxWidth)}
            >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

// ---- Error Boundary ----
interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    declare props: ErrorBoundaryProps;
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('UI error boundary:', error, info);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleClearAndReload = () => {
        localStorage.removeItem('luminaflow-auth');
        localStorage.removeItem('luminaflow-clinic-store');
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-[60vh] p-6">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 max-w-md w-full text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-amber-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Opa! Algo deu errado.</h2>
                        <p className="text-sm text-slate-500 mb-6">Estamos evitando a tela branca e recarregando resolve na maioria dos casos.</p>
                        {this.state.error?.message && (
                            <p className="text-xs text-slate-400 mb-4 break-words">{this.state.error.message}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReload}
                                className="flex-1 py-2.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all text-sm"
                            >
                                Recarregar
                            </button>
                            <button
                                onClick={this.handleClearAndReload}
                                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
                            >
                                Limpar Cache
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
