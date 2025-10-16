'use client';

import { useState, useEffect } from 'react';

// --- TIPAGEM DOS DADOS ---
interface Equipamento {
  lote_id: string;
  tipo_equipamento: string;
  sku: string;
  barebone: string;
  numero_serie: string;
}

interface TestItem {
    name: string;
    status: 'Aprovado' | 'Reprovado';
    observacao: string;
}

interface TestResult {
  equipamento: Equipamento;
  timestamp: string; // ISO string
  testes: { [key: string]: TestItem };
  observacoes_gerais: string;
}

// Tipagem para as props
interface TestesPageProps {
  testData: any;
  setActiveView: (view: string) => void;
}

export default function TestesPage({ testData, setActiveView }: TestesPageProps) {
  const { activeLoteId, testClasses, addTestResult } = testData;
  const [currentTest, setCurrentTest] = useState<any>(null);

  // Efeito para resetar o formulário de identificação ao mudar de lote
  useEffect(() => {
    setCurrentTest(null);
  }, [activeLoteId]);

  const handleIdentificacaoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const equipamentoData = Object.fromEntries(formData.entries());
    setCurrentTest({
      equipamento: {
        ...equipamentoData,
        lote_id: activeLoteId,
      },
      testes: {},
    });
  };

  const handleChecklistSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tipo = currentTest.equipamento.tipo_equipamento;
    
    const testResult: TestResult = {
        equipamento: currentTest.equipamento,
        timestamp: new Date().toISOString(),
        testes: {},
        observacoes_gerais: formData.get('obs_geral') as string,
    };

    testClasses[tipo].forEach((item: any) => {
        testResult.testes[item.id] = {
            name: item.name,
            status: formData.get(`status_${item.id}`) as 'Aprovado' | 'Reprovado',
            observacao: (formData.get(`obs_${item.id}`) as string) || ''
        };
    });

    addTestResult(testResult);
    alert('Relatório salvo! Adicione o próximo equipamento do lote.');
    setCurrentTest(null); // Reseta para o formulário de identificação
  };

  if (!activeLoteId) {
    return (
      <div className="text-center">
        <p className="text-red-600 font-semibold">Nenhum lote ativo selecionado.</p>
        <button onClick={() => setActiveView('lotes')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">
          Voltar para Lotes
        </button>
      </div>
    );
  }

  // Se não há um teste em andamento, mostra o formulário de identificação
  if (!currentTest) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Adicionar Equipamento ao Lote</h2>
        <div className="bg-blue-600 text-white p-3 rounded-md text-center font-bold mb-6">
          Lote Ativo: {activeLoteId}
        </div>
        <form id="form-identificacao" onSubmit={handleIdentificacaoSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="tipo_equipamento" className="block font-semibold mb-1">Tipo de Equipamento (Classe)</label>
              <select id="tipo_equipamento" name="tipo_equipamento" required className="w-full p-2 border rounded-md">
                <option value="" disabled>-- Selecione --</option>
                {Object.keys(testClasses).map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sku" className="block font-semibold mb-1">SKU do Equipamento</label>
              <input type="text" id="sku" name="sku" placeholder="Ex: 11194480" required className="w-full p-2 border rounded-md" />
            </div>
             <div>
              <label htmlFor="barebone" className="block font-semibold mb-1">Barebone / Modelo</label>
              <input type="text" id="barebone" name="barebone" placeholder="Ex: PST-NVR-30126-P" required className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label htmlFor="numero_serie" className="block font-semibold mb-1">Número de Série (S/N)</label>
              <input type="text" id="numero_serie" name="numero_serie" placeholder="Ex: ABC123456DEF" required className="w-full p-2 border rounded-md" />
            </div>
          </div>
          <button type="submit" className="mt-6 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
            Iniciar Checklist de Testes
          </button>
        </form>
      </div>
    );
  }
  
  // Se há um teste em andamento, mostra o checklist
  return (
     <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Checklist de Testes</h2>
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-md">
            <p><strong className="font-bold">Lote:</strong> {currentTest.equipamento.lote_id}</p>
            <p><strong className="font-bold">Tipo:</strong> {currentTest.equipamento.tipo_equipamento}</p>
            <p><strong className="font-bold">Barebone:</strong> {currentTest.equipamento.barebone}</p>
            <p><strong className="font-bold">S/N:</strong> {currentTest.equipamento.numero_serie}</p>
        </div>
        <form id="form-checklist" onSubmit={handleChecklistSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 font-bold p-2 border-b">
                <span>Item de Teste</span>
                <span>Status</span>
                <span>Observações</span>
            </div>
            {testClasses[currentTest.equipamento.tipo_equipamento]?.map((item: any) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-4 items-center p-2 border-b">
                    <div>
                        <strong className="block">{item.name}</strong>
                        <small className="text-gray-500">{item.desc}</small>
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="radio" name={`status_${item.id}`} value="Aprovado" required /> Aprovado</label>
                        <label className="flex items-center gap-2"><input type="radio" name={`status_${item.id}`} value="Reprovado" /> Reprovado</label>
                    </div>
                    <div>
                        <input type="text" name={`obs_${item.id}`} placeholder="Opcional" className="w-full p-2 border rounded-md" />
                    </div>
                </div>
            ))}
            <div className="mt-6">
                <label htmlFor="obs_geral" className="block font-semibold mb-1">Observações Gerais</label>
                <textarea id="obs_geral" name="obs_geral" className="w-full p-2 border rounded-md" rows={3}></textarea>
            </div>
            <button type="submit" className="mt-6 w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                Finalizar e Salvar Relatório
            </button>
        </form>
     </div>
  );
}
