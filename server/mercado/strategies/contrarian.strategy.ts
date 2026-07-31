import { Direction, TradeSignal } from '../types';
import { SentimentService } from '../sentiment.service';

export class ContrarianStrategy {
  constructor(private sentimentService: SentimentService) {}

  analyze(symbol: string): TradeSignal | null {
    const mood = this.sentimentService.getMood(symbol);
    if (!mood) return null;

    if (mood.classification === 'extreme_buy') {
      return {
        strategy: 'contrarian',
        direction: 'PUT',
        confidence: mood.mood,
        symbol,
        timestamp: Date.now(),
      };
    }

    if (mood.classification === 'extreme_sell') {
      return {
        strategy: 'contrarian',
        direction: 'CALL',
        confidence: 1 - mood.mood,
        symbol,
        timestamp: Date.now(),
      };
    }

    if (mood.classification === 'buy' && mood.mood > 0.8) {
      return {
        strategy: 'contrarian',
        direction: 'PUT',
        confidence: mood.mood * 0.85,
        symbol,
        timestamp: Date.now(),
      };
    }

    if (mood.classification === 'sell' && mood.mood < 0.2) {
      return {
        strategy: 'contrarian',
        direction: 'CALL',
        confidence: (1 - mood.mood) * 0.85,
        symbol,
        timestamp: Date.now(),
      };
    }

    return null;
  }
}
