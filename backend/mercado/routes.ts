import { Router, Request, Response } from 'express';
import { IQOptionService } from './iqoption.service';
import { TradingService } from './trading.service';
import { TradingEngine } from './strategies/engine';
import { SentimentService } from './sentiment.service';
import { GuruTracker } from './copy-trading/guru-tracker.service';
import { CopyTradingService } from './copy-trading/copy-trading.service';
import { LSTMPredictor } from './ai/lstm-predictor';
import { NewsSentimentAnalyzer } from './ai/news-sentiment';
import { NewsScraper } from './ai/news-scraper';
import { BacktestEngine } from './backtesting/backtest.engine';
import { CircuitBreaker } from './risk-management/circuit-breaker';
import { StopLossManager } from './risk-management/stop-loss';
import { PositionSizingKelly } from './risk-management/position-sizing';

export function createMercadoRoutes(
  iqOption: IQOptionService,
  tradingService: TradingService,
  engine: TradingEngine,
  sentimentService: SentimentService,
  guruTracker: GuruTracker,
  copyTrading: CopyTradingService,
  lstm: LSTMPredictor,
  newsAnalyzer: NewsSentimentAnalyzer,
  newsScraper: NewsScraper,
  circuitBreaker: CircuitBreaker,
  stopLoss: StopLossManager,
  positionSizing: PositionSizingKelly,
  backtest: BacktestEngine
): Router {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      connected: iqOption.isConnected(),
      tradingActive: tradingService.isActive(),
      engineRunning: engine.isRunning(),
      copyTradingActive: copyTrading.isActive(),
      lstmTrained: lstm.isTrained(),
    });
  });

  router.get('/balance', async (_req: Request, res: Response) => {
    try {
      const balance = await iqOption.getBalance();
      res.json({ balance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/positions', (_req: Request, res: Response) => {
    const positions = tradingService.getPositions();
    res.json({ positions });
  });

  router.get('/history', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = tradingService.getHistory(limit);
    res.json({ history });
  });

  router.get('/stats', (_req: Request, res: Response) => {
    const stats = tradingService.getStats();
    const breakerState = circuitBreaker.getState();
    res.json({ stats, circuitBreaker: breakerState });
  });

  router.post('/trade', async (req: Request, res: Response) => {
    try {
      const { symbol, direction, amount, durationSeconds, type } = req.body;
      const result = await tradingService.executeOrder({
        symbol, direction, amount, durationSeconds: durationSeconds || 60, type: type || 'BINARY',
      });
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/engine/start', async (_req: Request, res: Response) => {
    try {
      await engine.start();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/engine/stop', async (_req: Request, res: Response) => {
    try {
      await engine.stop();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/engine/config', (_req: Request, res: Response) => {
    res.json({ config: engine.getConfig() });
  });

  router.post('/engine/config', (req: Request, res: Response) => {
    try {
      engine.updateConfig(req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/signals', (_req: Request, res: Response) => {
    const signals = Array.from(engine.getLastSignals().entries()).map(([symbol, signal]) => ({ symbol, ...signal }));
    res.json({ signals });
  });

  router.get('/sentiment', (_req: Request, res: Response) => {
    const moods = sentimentService.getAllMoods();
    res.json({ moods });
  });

  router.get('/sentiment/:symbol', (req: Request, res: Response) => {
    const mood = sentimentService.getMood(req.params.symbol);
    if (!mood) return res.status(404).json({ error: 'Symbol not found' });
    res.json({ mood });
  });

  router.get('/gurus', (_req: Request, res: Response) => {
    const topGurus = guruTracker.getTopGurus(20);
    const allGurus = guruTracker.getAllGurus();
    res.json({ topGurus, total: allGurus.length });
  });

  router.get('/gurus/:id', (req: Request, res: Response) => {
    const guru = guruTracker.getGuru(req.params.id);
    if (!guru) return res.status(404).json({ error: 'Guru not found' });
    const history = guruTracker.getGuruHistory(req.params.id);
    res.json({ guru, history });
  });

  router.post('/copy/follow', (req: Request, res: Response) => {
    const { guruId, copyRatio, maxAmount, enabled } = req.body;
    copyTrading.followGuru(guruId, { copyRatio, maxAmountPerTrade: maxAmount, enabled });
    res.json({ success: true });
  });

  router.post('/copy/unfollow', (req: Request, res: Response) => {
    const { guruId } = req.body;
    copyTrading.unfollowGuru(guruId);
    res.json({ success: true });
  });

  router.get('/copy/followed', (_req: Request, res: Response) => {
    const followed = copyTrading.getFollowedGurus();
    res.json({ followed });
  });

  router.post('/trading/start', async (_req: Request, res: Response) => {
    try {
      await tradingService.start(req.body.autoTrade || false);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/trading/stop', async (_req: Request, res: Response) => {
    try {
      tradingService.stop();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/risk/config', (_req: Request, res: Response) => {
    res.json({
      circuitBreaker: circuitBreaker.getState(),
      stopLoss: stopLoss.getStats(),
      positionSizing: positionSizing.getStats(),
    });
  });

  router.post('/lstm/train', async (req: Request, res: Response) => {
    try {
      const { symbol, timeframe, count } = req.body;
      const candles = await iqOption.getHistoricalCandles(symbol || 'EURUSD', timeframe || 60, count || 1000);
      if (candles.length < 100) {
        return res.status(400).json({ error: 'Not enough candles. Need at least 100.' });
      }
      const loss = await lstm.train(candles);
      res.json({ success: true, finalLoss: loss, candlesUsed: candles.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/lstm/predict', async (req: Request, res: Response) => {
    try {
      const { symbol, timeframe } = req.body;
      const candles = await iqOption.getHistoricalCandles(symbol || 'EURUSD', timeframe || 60, 100);
      const prediction = await lstm.predict(candles);
      res.json({ prediction });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/news/add', async (req: Request, res: Response) => {
    try {
      const { title, summary, currency, impact } = req.body;
      await newsAnalyzer.addEconomicNews(title, summary, currency, impact);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/news/analysis', (_req: Request, res: Response) => {
    const analyses = newsAnalyzer.getAllAnalyses();
    res.json({ analyses });
  });

  router.get('/news/analysis/:symbol', (req: Request, res: Response) => {
    const analysis = newsAnalyzer.getAnalysis(req.params.symbol);
    if (!analysis) return res.status(404).json({ error: 'No analysis for symbol' });
    res.json({ analysis });
  });

  // ─── News Scraper Routes ──────────────────────────────────────
  router.get('/news/feed', (req: Request, res: Response) => {
    const { source, symbol, limit } = req.query;
    const news = newsScraper.getNews({
      source: source as string | undefined,
      symbol: symbol as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ news, stats: newsScraper.getStats() });
  });

  router.get('/news/feed/:symbol', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const news = newsScraper.getNewsBySymbol(req.params.symbol, limit);
    res.json({ symbol: req.params.symbol, news });
  });

  router.get('/news/sources', (_req: Request, res: Response) => {
    res.json({ sources: newsScraper.getAllSources(), stats: newsScraper.getStats() });
  });

  router.post('/news/scraper/start', async (_req: Request, res: Response) => {
    try {
      await newsScraper.startAll();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/news/scraper/stop', (_req: Request, res: Response) => {
    try {
      newsScraper.stopAll();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/news/stats', (_req: Request, res: Response) => {
    res.json(newsScraper.getStats());
  });

  router.post('/backtest', async (req: Request, res: Response) => {
    try {
      const { symbol, strategy, timeframe, count, params } = req.body;
      const candles = await iqOption.getHistoricalCandles(symbol || 'EURUSD', timeframe || 60, count || 500);
      if (candles.length < 100) {
        return res.status(400).json({ error: 'Not enough data for backtesting' });
      }
      const result = await backtest.run(symbol, strategy, candles, 1000, params || {});
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
