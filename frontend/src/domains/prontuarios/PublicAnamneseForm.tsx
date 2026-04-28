import React, { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useClinicStore } from '@/stores/clinicStore';
import { toast } from '@/hooks/useShared';

interface PublicAnamneseFormProps {
  token: string;
  onBack: () => void;
}

export function PublicAnamneseForm({ token, onBack }: PublicAnamneseFormProps) {
  const anamneseLinks = useClinicStore(state => state.anamneseLinks);
  const patients = useClinicStore(state => state.patients);
  const { submitAnamneseByToken } = useClinicStore();
  const [form, setForm] = useState({
    medical_history: '',
    current_medications: '',
    allergies: '',
    habits: '',
    complaints: '',
    observations: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const decodedLink = useMemo(() => {
    try {
      const json = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json);
      return {
        patient_id: payload.p,
        clinic_id: payload.c,
        expires_at: payload.e,
        token: token,
        status: 'active' as const
      };
    } catch (e) {
      console.error('Erro ao decodificar token stateless:', e);
      return null;
    }
  }, [token]);

  // Fallback to store if stateless fails or for legacy links
  const storeLink = useMemo(() => {
    return anamneseLinks.find(item => item.token === token) || null;
  }, [anamneseLinks, token]);

  const link = decodedLink || storeLink;

  const patient = useMemo(() => {
    return patients.find(item => item.id === link?.patient_id) || null;
  }, [patients, link?.patient_id]);

  const handleSubmit = async () => {
    if (!link) return;

    // Check expiry
    if (new Date(link.expires_at).getTime() < Date.now()) {
      toast('Este link expirou.', 'error');
      return;
    }

    try {
      // 1. Submit to server for cross-device sync
      const response = await fetch('/api/public/submit-anamnese', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          data: form,
          patientId: link.patient_id,
          clinicId: link.clinic_id
        })
      });

      if (!response.ok) throw new Error('Erro ao enviar para o servidor');

      // 2. Also save locally if we happen to be in the same browser
      submitAnamneseByToken(token, form);

      setSubmitted(true);
      toast('Anamnese enviada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro na submissão:', error);
      toast('Erro ao enviar anamnese. Tente novamente.', 'error');
    }
  };

  if (!link) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 max-w-md text-center">
          <p className="text-lg font-bold text-slate-900">Link inválido</p>
          <p className="text-sm text-slate-500 mt-2">Solicite um novo link de anamnese para a clínica.</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Anamnese Digital</h1>
          <p className="text-slate-500 mt-1">Paciente: <strong>{patient?.name || 'Não informado'}</strong></p>

          {submitted ? (
            <div className="mt-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800">
              <p className="font-bold">Anamnese enviada com sucesso!</p>
              <p className="text-sm mt-1">Sua equipe clínica já recebeu as informações no prontuário.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              {[
                { key: 'medical_history', label: 'Histórico médico' },
                { key: 'current_medications', label: 'Medicamentos em uso' },
                { key: 'allergies', label: 'Alergias' },
                { key: 'habits', label: 'Hábitos' },
                { key: 'complaints', label: 'Queixa principal' },
                { key: 'observations', label: 'Observações adicionais' },
              ].map(field => (
                <label key={field.key} className="text-sm font-medium text-slate-600 block">
                  {field.label}
                  <textarea
                    value={(form as any)[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[90px]"
                  />
                </label>
              ))}
              <button onClick={handleSubmit} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 inline-flex items-center justify-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Enviar Anamnese
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
