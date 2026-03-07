import type { AppointmentConfirmation, ReminderChannel } from '@/types';

const CONFIRMATION_DEDUPE_WINDOW_MS = 15 * 60 * 1000;

export function resolveClinicId(inputClinicId?: string, authClinicId?: string): string {
  const input = (inputClinicId || '').trim();
  if (input) return input;
  const auth = (authClinicId || '').trim();
  if (auth) return auth;
  return 'clinic-1';
}

export function normalizePhone(value?: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(0, 13);
}

export function normalizeEmail(value?: string): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (!email.includes('@')) return null;
  return email;
}

export function resolveRecipient(
  channel: ReminderChannel,
  patient?: { phone?: string; email?: string } | null
): string | null {
  if (!patient) return null;
  if (channel === 'email') return normalizeEmail(patient.email);
  return normalizePhone(patient.phone);
}

export function isDuplicateAppointmentConfirmation(
  items: AppointmentConfirmation[],
  input: { appointment_id: string; channel: ReminderChannel; createdAt?: number }
): boolean {
  const nowTs = typeof input.createdAt === 'number' ? input.createdAt : Date.now();
  return items.some((item) => {
    if (item.appointment_id !== input.appointment_id) return false;
    if (item.channel !== input.channel) return false;
    if (item.status === 'failed') return false;
    const createdAt = new Date(item.created_at).getTime();
    if (!Number.isFinite(createdAt)) return true;
    return nowTs - createdAt <= CONFIRMATION_DEDUPE_WINDOW_MS;
  });
}

