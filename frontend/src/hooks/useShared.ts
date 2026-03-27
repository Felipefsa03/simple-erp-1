import { useState, useCallback, useRef, useEffect } from 'react';
import { uid, formatCurrency, formatDateBR } from '@/lib/utils';

// ---- Anti-double-click hook ----
export function useSubmitOnce<T extends any[]>(fn: (...args: T) => Promise<void> | void) {
    const [loading, setLoading] = useState(false);
    const loadingRef = useRef(false);
    const submit = useCallback(async (...args: T) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            await fn(...args);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [fn]);
    return { submit, loading };
}

// ---- Debounced value hook ----
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

// ---- Toast notification system ----
export interface ToastMsg {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

let toastCallback: ((msg: ToastMsg) => void) | null = null;

export function registerToastCallback(cb: (msg: ToastMsg) => void) {
    toastCallback = cb;
}

export function toast(message: string, type: ToastMsg['type'] = 'success') {
    if (toastCallback) {
        const id = uid();
        toastCallback({ id, message, type });
    }
}

// Re-export from lib/utils for backward compatibility
export { formatCurrency, formatDateBR } from '@/lib/utils';
