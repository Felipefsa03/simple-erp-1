// ============================================
// clinxia ERP — Domain Event Bus
// ============================================
import { create } from 'zustand';
import type { DomainEvent, DomainEventType } from '@/types';

type EventHandler = (event: DomainEvent) => void;

interface EventBusState {
    events: DomainEvent[];
    listeners: Map<DomainEventType, EventHandler[]>;
    emit: (type: DomainEventType, payload: Record<string, any>) => void;
    on: (type: DomainEventType, handler: EventHandler) => () => void;
}

export const useEventBus = create<EventBusState>((set, get) => ({
    events: [],
    listeners: new Map(),

    emit: (type, payload) => {
        const event: DomainEvent = {
            type,
            payload,
            timestamp: new Date().toISOString(),
        };

        set(state => ({ events: [event, ...state.events].slice(0, 100) }));

        const handlers = get().listeners.get(type) || [];
        handlers.forEach(handler => {
            try { handler(event); } catch (e) { console.error(`Event handler error for ${type}:`, e); }
        });
    },

    on: (type, handler) => {
        const { listeners } = get();
        const existing = listeners.get(type) || [];
        listeners.set(type, [...existing, handler]);
        set({ listeners: new Map(listeners) });

        return () => {
            const { listeners } = get();
            const current = listeners.get(type) || [];
            listeners.set(type, current.filter(h => h !== handler));
            set({ listeners: new Map(listeners) });
        };
    },
}));

