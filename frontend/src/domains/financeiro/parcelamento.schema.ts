import { z } from 'zod';
import { addMonths, parseISO, format } from 'date-fns';

export const ParcelamentoSchema = z.object({
  valor_total: z.number().positive('Valor deve ser positivo'),
  num_parcelas: z.number().int().min(1, 'Mínimo 1 parcela').max(24, 'Máximo 24 parcelas'),
  data_primeira_parcela: z.string().min(1, 'Data obrigatória'),
  forma_pagamento: z.enum(['pix', 'cartao', 'dinheiro', 'transferencia'], {
    error: 'Selecione uma forma de pagamento',
  }),
});

export type ParcelamentoFormData = z.infer<typeof ParcelamentoSchema>;

export interface Parcela {
  numero: number;
  valor: number;
  vencimento: string;
  status: 'pendente' | 'pago';
}

/**
 * Calculate installment values with penny-rounding absorbed by the first installment.
 */
export function calcularParcelas(
  valorTotal: number,
  numParcelas: number,
  dataPrimeira: string
): Parcela[] {
  const valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100;
  const diferenca = Math.round((valorTotal - valorParcela * numParcelas) * 100) / 100;

  return Array.from({ length: numParcelas }, (_, i) => ({
    numero: i + 1,
    valor: i === 0 ? valorParcela + diferenca : valorParcela,
    vencimento: format(addMonths(parseISO(dataPrimeira), i), 'yyyy-MM-dd'),
    status: 'pendente' as const,
  }));
}
