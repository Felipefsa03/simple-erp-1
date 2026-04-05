import { z } from 'zod';

export const TransacaoSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.string().min(1, 'Valor obrigatório').refine(
    (v) => {
      const num = parseFloat(v.replace(',', '.'));
      return !isNaN(num) && num > 0;
    },
    { message: 'Valor deve ser um número positivo' }
  ),
  category: z.string().min(1, 'Categoria obrigatória'),
  patient_name: z.string().optional().or(z.literal('')),
});

export type TransacaoFormData = z.infer<typeof TransacaoSchema>;
