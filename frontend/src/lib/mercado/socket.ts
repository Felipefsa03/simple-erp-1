type Listener = (data: any) => void;

class MercadoSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:3000' : window.location.host;
    this.url = `${protocol}//${host}/ws/mercado`;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[MercadoSocket] Connected');
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.emit(msg.type, msg.data);
        } catch { }
      };

      this.ws.onclose = () => {
        console.log('[MercadoSocket] Disconnected');
        this.emit('disconnected', {});
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[MercadoSocket] Error:', err);
      };
    } catch (error) {
      console.error('[MercadoSocket] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  on(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  private emit(type: string, data: any) {
    this.listeners.get(type)?.forEach(fn => fn(data));
  }
}

export const mercadoSocket = new MercadoSocket();
