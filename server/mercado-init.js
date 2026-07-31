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
    const { createMercadoRoutes } = await import('./mercado/routes');
    const { IQOptionService } = await import('./mercado/iqoption.service');
    const { TradingService } = await import('./mercado/trading.service');
    const { TradingEngine } = await import('./mercado/strategies/engine');
    const { SentimentService } = await import('./mercado/sentiment.service');
    const { GuruTracker } = await import('./mercado/copy-trading/guru-tracker.service');
    const { CopyTradingService } = await import('./mercado/copy-trading/copy-trading.service');
    const { LSTMPredictor } = await import('./mercado/ai/lstm-predictor');
    const { NewsSentimentAnalyzer } = await import('./mercado/ai/news-sentiment');
    const { NewsScraper } = await import('./mercado/ai/news-scraper');
    const { BacktestEngine } = await import('./mercado/backtesting/backtest.engine');
    const { CircuitBreaker } = await import('./mercado/risk-management/circuit-breaker');
    const { StopLossManager } = await import('./mercado/risk-management/stop-loss');
    const { PositionSizingKelly } = await import('./mercado/risk-management/position-sizing');

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
    const connected = await Promise.race([
      iqOption.connect(),
      new Promise(resolve => setTimeout(() => { console.log('[Mercado] Connection timeout (5s). Continuing in offline mode.'); resolve(false); }, 5000)),
    ]);
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
