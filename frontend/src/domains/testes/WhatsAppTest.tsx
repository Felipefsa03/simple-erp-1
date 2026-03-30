import React, { useState } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/useShared';

const API_BASE = 'https://clinxia-backend.onrender.com';

const testNumbers = [
  { name: 'Ana Paula (SP)', phone: '5511987654321', expected: 'works' },
  { name: 'Antonio (BA)', phone: '5575991517196', expected: 'broken' },
  { name: 'Juliana (BA)', phone: '5575999231672', expected: 'broken' },
];

export function WhatsAppTest() {
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const testSend = async (phone: string, name: string) => {
    setSending(phone);
    setResults(prev => ({ ...prev, [phone]: { success: false, message: 'Enviando...' } }));

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: 'clinxia',
          to: phone,
          message: `Teste de envio para ${name} - ${new Date().toLocaleTimeString('pt-BR')}`,
        }),
      });

      const data = await res.json();
      
      setResults(prev => ({
        ...prev,
        [phone]: {
          success: data.ok,
          message: data.ok ? `Enviado! ID: ${data.messageId}` : `Erro: ${data.error}`,
        },
      }));

      if (data.ok) {
        toast('Mensagem enviada!', 'success');
      } else {
        toast(`Erro: ${data.error}`, 'error');
      }
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [phone]: { success: false, message: `Erro: ${err.message}` },
      }));
      toast(`Erro: ${err.message}`, 'error');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teste de Envio WhatsApp</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          <strong>Objetivo:</strong> Testar envio para 3 números e identificar qual funciona e qual não funciona.
        </p>
      </div>

      <div className="space-y-4">
        {testNumbers.map((item) => (
          <div
            key={item.phone}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-slate-500">+{item.phone}</p>
              {results[item.phone] && (
                <p className={`text-sm mt-1 ${
                  results[item.phone].success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {results[item.phone].message}
                </p>
              )}
            </div>

            <button
              onClick={() => testSend(item.phone, item.name)}
              disabled={sending === item.phone}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {sending === item.phone ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Testar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium mb-2">Resultados:</h3>
        <div className="space-y-1 text-sm">
          {Object.entries(results).map(([phone, result]) => (
            <div key={phone} className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>{phone}: {result.success ? 'OK' : 'FALHOU'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
