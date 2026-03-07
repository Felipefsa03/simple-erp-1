import React, { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useClinicStore } from '@/stores/clinicStore';
import { toast } from '@/hooks/useShared';

interface PublicAnamneseFormProps {
  token: string;
  onBack: () => void;
}

export function PublicAnamneseForm({ token, onBack }: PublicAnamneseFormProps) {
  const { anamneseLinks, patients, submitAnamneseByToken } = useClinicStore();
  const [form, setForm] = useState({
    medical_history: '',
    current_medications: '',
    allergies: '',
    habits: '',
    complaints: '',
    observations: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const link = useMemo(() => anamneseLinks.find(item => item.token === token), [anamneseLinks, token]);
  const patient = useMemo(() => patients.find(item => item.id === link?.patient_id), [patients, link?.patient_id]);

  const handleSubmit = () => {
    if (!link) return;
    const ok = submitAnamneseByToken(token, form);
    if (!ok) {
      toast('Este link expirou ou ja foi utilizado.', 'error');
      return;
    }
    setSubmitted(true);
  };

  if (!link) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 max-w-md text-center">
          <p className="text-lg font-bold text-slate-900">Link inválido</p>
          <p className="text-sm text-slate-500 mt-2">Solicite um novo link de anamnese para a clínica.</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-xl font-bold">Voltar</button>
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
              <button onClick={handleSubmit} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 inline-flex items-center justify-center gap-2">
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
