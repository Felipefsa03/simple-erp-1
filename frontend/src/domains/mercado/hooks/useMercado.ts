import { useState, useEffect, useCallback, useRef } from 'react';
import { mercadoApi } from '@/lib/mercado/api';
import { mercadoSocket } from '@/lib/mercado/socket';

export interface MercadoState {
  connected: boolean;
  balance: number;
  positions: any[];
  history: any[];
  stats: any;
  signals: any[];
  moods: any[];
  gurus: any[];
  followedGurus: any[];
  engineRunning: boolean;
  tradingActive: boolean;
  riskConfig: any;
  newsAnalysis: any[];
  loading: boolean;
  error: string | null;
}

export function useMercado() {
  const [state, setState] = useState<MercadoState>({
    connected: false,
    balance: 0,
    positions: [],
    history: [],
    stats: null,
    signals: [],
    moods: [],
    gurus: [],
    followedGurus: [],
    engineRunning: false,
    tradingActive: false,
    riskConfig: null,
    newsAnalysis: [],
    loading: true,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const [status, balance, positions, history, stats, signals, sentiment, gurus, followed, risk, news] =
        await Promise.allSettled([
          mercadoApi.status(),
          mercadoApi.balance(),
          mercadoApi.positions(),
          mercadoApi.history(),
          mercadoApi.stats(),
          mercadoApi.signals(),
          mercadoApi.sentiment(),
          mercadoApi.gurus(),
          mercadoApi.copyFollowed(),
          mercadoApi.riskConfig(),
          mercadoApi.newsAnalysis(),
        ]);

      setState(prev => ({
        ...prev,
        connected: status.status === 'fulfilled' ? status.value.connected : prev.connected,
        balance: balance.status === 'fulfilled' ? balance.value.balance : prev.balance,
        positions: positions.status === 'fulfilled' ? positions.value.positions : prev.positions,
        history: history.status === 'fulfilled' ? history.value.history : prev.history,
        stats: stats.status === 'fulfilled' ? stats.value.stats : prev.stats,
        signals: signals.status === 'fulfilled' ? signals.value.signals : prev.signals,
        moods: sentiment.status === 'fulfilled' ? sentiment.value.moods : prev.moods,
        gurus: gurus.status === 'fulfilled' ? gurus.value.topGurus : prev.gurus,
        followedGurus: followed.status === 'fulfilled' ? followed.value.followed : prev.followedGurus,
        riskConfig: risk.status === 'fulfilled' ? risk.value : prev.riskConfig,
        newsAnalysis: news.status === 'fulfilled' ? news.value.analyses : prev.newsAnalysis,
        engineRunning: status.status === 'fulfilled' ? status.value.engineRunning : prev.engineRunning,
        tradingActive: status.status === 'fulfilled' ? status.value.tradingActive : prev.tradingActive,
        loading: false,
        error: null,
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    refresh();
    mercadoSocket.connect();

    const unsubCandle = mercadoSocket.on('candle', () => refresh());
    const unsubSignal = mercadoSocket.on('signal', () => refresh());
    const unsubOrder = mercadoSocket.on('order-result', () => refresh());

    intervalRef.current = setInterval(refresh, 3000);

    return () => {
      mercadoSocket.disconnect();
      unsubCandle();
      unsubSignal();
      unsubOrder();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  const actions = {
    refresh,
    trade: async (data: any) => {
      const result = await mercadoApi.trade(data);
      await refresh();
      return result;
    },
    startEngine: async () => { await mercadoApi.engineStart(); await refresh(); },
    stopEngine: async () => { await mercadoApi.engineStop(); await refresh(); },
    startTrading: async (auto = false) => { await mercadoApi.tradingStart(auto); await refresh(); },
    stopTrading: async () => { await mercadoApi.tradingStop(); await refresh(); },
    followGuru: async (data: any) => { await mercadoApi.copyFollow(data); await refresh(); },
    unfollowGuru: async (guruId: string) => { await mercadoApi.copyUnfollow({ guruId }); await refresh(); },
    trainLSTM: async (data: any) => { const r = await mercadoApi.lstmTrain(data); await refresh(); return r; },
    runBacktest: async (data: any) => await mercadoApi.backtest(data),
  };

  return { ...state, ...actions };
}
