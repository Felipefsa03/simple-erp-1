const IQ_OPTION_EMAIL = process.env.IQ_OPTION_EMAIL || '';
const IQ_OPTION_PASSWORD = process.env.IQ_OPTION_PASSWORD || '';

let mercadoRouter = null;

async function initMercado() {
  if (!IQ_OPTION_EMAIL || !IQ_OPTION_PASSWORD) {
    console.log('[Mercado] IQ Option credentials not configured. Skipping initialization.');
    console.log('[Mercado] Set IQ_OPTION_EMAIL and IQ_OPTION_PASSWORD env vars.');
    return;
  }

  try {
    const { createMercadoRoutes } = await import('../backend/mercado/routes');
    const { IQOptionService } = await import('../backend/mercado/iqoption.service');
    const { TradingService } = await import('../backend/mercado/trading.service');
    const { TradingEngine } = await import('../backend/mercado/strategies/engine');
    const { SentimentService } = await import('../backend/mercado/sentiment.service');
    const { GuruTracker } = await import('../backend/mercado/copy-trading/guru-tracker.service');
    const { CopyTradingService } = await import('../backend/mercado/copy-trading/copy-trading.service');
    const { LSTMPredictor } = await import('../backend/mercado/ai/lstm-predictor');
    const { NewsSentimentAnalyzer } = await import('../backend/mercado/ai/news-sentiment');
    const { NewsScraper } = await import('../backend/mercado/ai/news-scraper');
    const { BacktestEngine } = await import('../backend/mercado/backtesting/backtest.engine');
    const { CircuitBreaker } = await import('../backend/mercado/risk-management/circuit-breaker');
    const { StopLossManager } = await import('../backend/mercado/risk-management/stop-loss');
    const { PositionSizingKelly } = await import('../backend/mercado/risk-management/position-sizing');

    const iqOption = new IQOptionService(IQ_OPTION_EMAIL, IQ_OPTION_PASSWORD);
    const sentimentService = new SentimentService(iqOption);
    const circuitBreaker = new CircuitBreaker();
    const stopLoss = new StopLossManager();
    const positionSizing = new PositionSizingKelly();
    const tradingService = new TradingService(iqOption, circuitBreaker, stopLoss, positionSizing, iqOption.getHumanizer());
    const lstm = new LSTMPredictor();
    const newsAnalyzer = new NewsSentimentAnalyzer();
    const newsScraper = new NewsScraper();
    const engine = new TradingEngine(iqOption, tradingService, sentimentService, lstm, newsAnalyzer);
    const guruTracker = new GuruTracker(iqOption);
    const copyTrading = new CopyTradingService(guruTracker, tradingService, iqOption);
    const backtest = new BacktestEngine();

    console.log('[Mercado] Connecting to IQ Option...');
    const connected = await iqOption.connect();
    if (connected) {
      console.log('[Mercado] Connected to IQ Option successfully');
    } else {
      console.warn('[Mercado] Could not connect to IQ Option. Running in offline mode.');
    }

    // Start news scraper (captura notícias do Google, Yahoo, Twitter/X em tempo real)
    newsScraper.configure({
      keywords: ['EURUSD', 'BITCOIN', 'AAPL', 'TSLA', 'FOREX', 'TRADING'],
      apiKeys: {
        alphavantage: process.env.ALPHA_VANTAGE_KEY || '',
        twitter: process.env.TWITTER_BEARER_TOKEN || '',
      },
    });
    newsScraper.startAll().catch(err => console.error('[Mercado] NewsScraper error:', err.message));
    newsScraper.on('news', (news) => {
      console.log(`[NewsScraper] ${news.source}: ${news.title.substring(0, 60)}...`);
    });

    mercadoRouter = createMercadoRoutes(
      iqOption, tradingService, engine, sentimentService,
      guruTracker, copyTrading, lstm, newsAnalyzer, newsScraper,
      circuitBreaker, stopLoss, positionSizing, backtest
    );

    console.log('[Mercado] Module ready at /api/mercado');
  } catch (error) {
    console.error('[Mercado] Initialization error:', error.message);
  }
}

function getMercadoRouter() {
  return mercadoRouter;
}

export { initMercado, getMercadoRouter };
