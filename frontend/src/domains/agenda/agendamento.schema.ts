import { z } from 'zod';

export const AgendamentoSchema = z.object({
  patient_id: z.string().min(1, 'Selecione um paciente'),
  professional_id: z.string().min(1, 'Selecione um profissional'),
  service_id: z.string().optional(),
  date: z.string().min(1, 'Data obrigatória'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
});

export type AgendamentoFormData = z.infer<typeof AgendamentoSchema>;
