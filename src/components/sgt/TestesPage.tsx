'use client';

import { useState, useEffect } from 'react';

// --- TIPAGEM DOS DADOS ---
interface TestClass {
  id: number;
  name: string;
  test_items: any[];
}

interface TestesPageProps {
  testData: {
    activeLoteId: string | null;
    testClasses: TestClass[];
    addTestResult: (testResult: any) => void;
  };
  setActiveView: (view: string) => void;
}

export default function TestesPage({ testData, setActiveView }: TestesPageProps) {
  const { activeLoteId, testClasses, addTestResult } = testData;
  const [currentTest, setCurrentTest] = useState<any>(null);

  useEffect(() => {
    setCurrentTest(null);
  }, [activeLoteId]);

  const handleIdentificacaoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const equipamentoData = {
      equipment_type: formData.get('tipo_equipamento') as string,
      equipment_sku: formData.get('sku') as string,
      equipment_barebone: formData.get('barebone') as string,
      equipment_serial: formData.get('numero_serie') as string,
    };
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
    const tipo = currentTest.equipamento.equipment_type;
    const testClass = testClasses.find(tc => tc.name === tipo);

    if (!testClass) {
      alert("Classe de teste não encontrada!");
      return;
    }

    const testResultItems = testClass.test_items.map((item: any) => ({
      test_item_name: item.name,
      status: formData.get(`status_${item.id}`) as 'Aprovado' | 'Reprovado',
      observation: (formData.get(`obs_${item.id}`) as string) || ''
    }));
    
    const testResult = {
        ...currentTest.equipamento,
        general_observations: formData.get('obs_geral') as string,
        test_result_items: testResultItems,
    };

    addTestResult(testResult);
    alert('Relatório salvo! Adicione o próximo equipamento do lote.');
    setCurrentTest(null);
  };

  if (!activeLoteId) {
    return (
      <div className="text-center">
        <p className="text-red-400 font-semibold">Nenhum lote ativo selecionado.</p>
        <button onClick={() => setActiveView('lotes')} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md">
          Voltar para Lotes
        </button>
      </div>
    );
  }

  if (!currentTest) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Adicionar Equipamento ao Lote</h2>
        <div className="bg-purple-600 text-white p-3 rounded-md text-center font-bold mb-6">
          Lote Ativo: {activeLoteId}
        </div>
        <form id="form-identificacao" onSubmit={handleIdentificacaoSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="tipo_equipamento" className="block font-semibold mb-1 text-gray-300">Tipo de Equipamento (Classe)</label>
              <select id="tipo_equipamento" name="tipo_equipamento" required className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500">
                <option value="" disabled>-- Selecione --</option>
                {testClasses.map(tc => (
                  <option key={tc.id} value={tc.name}>{tc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sku" className="block font-semibold mb-1 text-gray-300">SKU do Equipamento</label>
              <input type="text" id="sku" name="sku" placeholder="Ex: 11194480" required className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500" />
            </div>
             <div>
              <label htmlFor="barebone" className="block font-semibold mb-1 text-gray-300">Barebone / Modelo</label>
              <input type="text" id="barebone" name="barebone" placeholder="Ex: PST-NVR-30126-P" required className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500" />
            </div>
            <div>
              <label htmlFor="numero_serie" className="block font-semibold mb-1 text-gray-300">Número de Série (S/N)</label>
              <input type="text" id="numero_serie" name="numero_serie" placeholder="Ex: ABC123456DEF" required className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500" />
            </div>
          </div>
          <button type="submit" className="mt-6 w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700">
            Iniciar Checklist de Testes
          </button>
        </form>
      </div>
    );
  }
  
  const testClass = testClasses.find(tc => tc.name === currentTest.equipamento.equipment_type);

  return (
     <div>
        <h2 className="text-2xl font-bold text-white mb-4">Checklist de Testes</h2>
        <div className="bg-purple-900 border-l-4 border-purple-500 text-purple-200 p-4 mb-6 rounded-md">
            <p><strong className="font-bold">Lote:</strong> {currentTest.equipamento.lote_id}</p>
            <p><strong className="font-bold">Tipo:</strong> {currentTest.equipamento.equipment_type}</p>
            <p><strong className="font-bold">Barebone:</strong> {currentTest.equipamento.equipment_barebone}</p>
            <p><strong className="font-bold">S/N:</strong> {currentTest.equipamento.equipment_serial}</p>
        </div>
        <form id="form-checklist" onSubmit={handleChecklistSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 font-bold p-2 border-b border-gray-700">
                <span>Item de Teste</span>
                <span>Status</span>
                <span>Observações</span>
            </div>
            {testClass?.test_items.map((item: any) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-4 items-center p-2 border-b border-gray-700">
                    <div>
                        <strong className="block">{item.name}</strong>
                        <small className="text-gray-400">{item.description}</small>
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="radio" name={`status_${item.id}`} value="Aprovado" required /> Aprovado</label>
                        <label className="flex items-center gap-2"><input type="radio" name={`status_${item.id}`} value="Reprovado" /> Reprovado</label>
                    </div>
                    <div>
                        <input type="text" name={`obs_${item.id}`} placeholder="Opcional" className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500" />
                    </div>
                </div>
            ))}
            <div className="mt-6">
                <label htmlFor="obs_geral" className="block font-semibold mb-1 text-gray-300">Observações Gerais</label>
                <textarea id="obs_geral" name="obs_geral" className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500" rows={3}></textarea>
            </div>
            <button type="submit" className="mt-6 w-full py-3 px-4 bg-purple-500 text-white font-semibold rounded-md shadow-sm hover:bg-purple-600">
                Finalizar e Salvar Relatório
            </button>
        </form>
     </div>
  );
}
