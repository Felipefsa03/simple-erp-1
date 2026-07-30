import * as tf from '@tensorflow/tfjs';
import { Candle, Direction } from '../types';

interface PredictionResult {
  direction: Direction;
  confidence: number;
  probabilityCall: number;
  probabilityPut: number;
}

export class LSTMPredictor {
  private model: tf.LayersModel | null = null;
  private trained = false;
  private sequenceLength = 60;
  private features = 5;

  async buildModel() {
    this.model = tf.sequential();

    this.model.add(tf.layers.lstm({
      units: 50,
      returnSequences: true,
      inputShape: [this.sequenceLength, this.features],
    }));

    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.lstm({
      units: 50,
      returnSequences: false,
    }));

    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.dense({ units: 25, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    console.log('[LSTM] Model built successfully');
  }

  async train(candles: Candle[], epochs: number = 50, batchSize: number = 32): Promise<number> {
    if (candles.length < this.sequenceLength + 1) {
      console.warn('[LSTM] Not enough data for training');
      return 0;
    }

    if (!this.model) await this.buildModel();

    const { sequences, labels } = this.prepareData(candles);

    if (sequences.length === 0 || labels.length === 0) {
      console.warn('[LSTM] No valid sequences after data preparation');
      return 0;
    }

    const xs = tf.tensor3d(sequences, [sequences.length, this.sequenceLength, this.features]);
    const ys = tf.tensor2d(labels, [labels.length, 2]);

    console.log(`[LSTM] Training with ${sequences.length} sequences, ${epochs} epochs`);

    const result = await this.model!.fit(xs, ys, {
      epochs,
      batchSize,
      shuffle: true,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`[LSTM] Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, acc=${logs?.acc?.toFixed(4)}`);
          }
        },
      },
    });

    const finalLoss = result.history.loss[result.history.loss.length - 1] as number;
    this.trained = true;

    xs.dispose();
    ys.dispose();

    console.log(`[LSTM] Training complete. Final loss: ${finalLoss.toFixed(4)}`);
    return finalLoss;
  }

  async predict(candles: Candle[]): Promise<PredictionResult> {
    if (!this.model || !this.trained) {
      return {
        direction: this.fallbackPrediction(candles),
        confidence: 0.5,
        probabilityCall: 0.5,
        probabilityPut: 0.5,
      };
    }

    if (candles.length < this.sequenceLength) {
      return {
        direction: this.fallbackPrediction(candles),
        confidence: 0.5,
        probabilityCall: 0.5,
        probabilityPut: 0.5,
      };
    }

    const sequence = this.normalizeSequence(candles.slice(-this.sequenceLength));
    const input = tf.tensor3d([sequence], [1, this.sequenceLength, this.features]);

    const output = this.model.predict(input) as tf.Tensor;
    const probabilities = await output.data();

    const probCall = probabilities[0];
    const probPut = probabilities[1];
    const confidence = Math.max(probCall, probPut);
    const direction: Direction = probCall > probPut ? 'CALL' : 'PUT';

    input.dispose();
    output.dispose();

    return {
      direction,
      confidence,
      probabilityCall: probCall,
      probabilityPut: probPut,
    };
  }

  private prepareData(candles: Candle[]): { sequences: number[][][]; labels: number[][] } {
    const sequences: number[][][] = [];
    const labels: number[][] = [];

    for (let i = 0; i <= candles.length - this.sequenceLength - 1; i++) {
      const sequence = candles.slice(i, i + this.sequenceLength);
      const target = candles[i + this.sequenceLength];

      const normalized = this.normalizeSequence(sequence);
      const label = target.close > sequence[sequence.length - 1].close ? [1, 0] : [0, 1];

      sequences.push(normalized);
      labels.push(label);
    }

    return { sequences, labels };
  }

  private normalizeSequence(sequence: Candle[]): number[][] {
    const basePrice = sequence[0].open;
    return sequence.map(candle => [
      (candle.open - basePrice) / basePrice,
      (candle.close - basePrice) / basePrice,
      (candle.max - basePrice) / basePrice,
      (candle.min - basePrice) / basePrice,
      candle.volume / (sequence.reduce((s, c) => s + c.volume, 0) / sequence.length || 1),
    ]);
  }

  private fallbackPrediction(candles: Candle[]): Direction {
    if (candles.length < 3) return 'CALL';
    const last3 = candles.slice(-3);
    const avgChange = last3.reduce((sum, c, i) => {
      if (i === 0) return 0;
      return sum + (c.close - last3[i - 1].close);
    }, 0);
    return avgChange >= 0 ? 'CALL' : 'PUT';
  }

  isTrained(): boolean {
    return this.trained;
  }

  async saveModel(path: string) {
    if (this.model) {
      await this.model.save(`file://${path}`);
    }
  }

  async loadModel(path: string) {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
    this.trained = true;
  }
}
