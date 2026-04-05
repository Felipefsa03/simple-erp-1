import { z } from 'zod';

export const PacienteSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  phone: z
    .string()
    .min(1, 'Telefone obrigatório'),
  email: z.string().email('E-mail inválido').min(1, 'E-mail obrigatório'),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos sem pontuação')
    .optional()
    .or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
});

export type PacienteFormData = z.infer<typeof PacienteSchema>;

/** Schema for import validation — more lenient than create */
export const PacienteImportSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  cpf: z.string().optional(),
});
