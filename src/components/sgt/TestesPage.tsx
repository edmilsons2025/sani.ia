'use client';

import { useState, useEffect } from 'react';

// --- DEFINIÇÕES DE TIPO ---

/**
 * Representa a estrutura de um Lote de teste.
 */
interface Lote {
  id: string;
  name: string;
  status: string;
}

/**
 * Representa a estrutura de uma Classe de Teste.
 */
interface TestClass {
  id: string;
  name: string;
  /** @property {any[]} test_items - Temporariamente como 'any' para flexibilidade. */
  test_items: any[];
}

/**
 * Define as propriedades esperadas pelo componente TestesPage.
 */
interface TestesPageProps {
  /**
   * Contém os dados e funções de manipulação de estado
   * fornecidos pelo componente pai.
   */
  testData: {
    /** O UUID do lote atualmente selecionado. */
    activeLoteId: string | null;
    /** A lista de todas as classes de teste disponíveis. */
    testClasses: TestClass[];
    /** A lista de todos os lotes (para encontrar o nome). */
    lotes: Lote[];
    /** Função para adicionar um novo resultado de teste. */
    addTestResult: (testResult: any) => void;
  };
  /**
   * Função para alterar a visualização ativa na página principal (ex: 'lotes').
   */
  setActiveView: (view: string) => void;
}

/**
 * Componente TestesPage
 *
 * Responsável pelo fluxo de execução de testes para um lote ativo.
 * Renderiza dois estados principais:
 * 1. Formulário de identificação do equipamento (se nenhum teste estiver em andamento).
 * 2. Formulário de checklist (após a identificação do equipamento).
 *
 * @param {TestesPageProps} props - As propriedades do componente.
 * @returns {JSX.Element} O componente TestesPage renderizado.
 */
export default function TestesPage({ testData, setActiveView }: TestesPageProps) {
  const { activeLoteId, testClasses, lotes, addTestResult } = testData;
  const [currentTest, setCurrentTest] = useState<any>(null);

  /**
   * Efeito que reseta o formulário (volta para a identificação)
   * sempre que o lote ativo for alterado.
   */
  useEffect(() => {
    setCurrentTest(null);
  }, [activeLoteId]);

  /**
   * Manipula o envio do formulário de identificação do equipamento.
   * Armazena os dados do equipamento no estado `currentTest` e avança
   * para a tela de checklist.
   * @param e - O evento do formulário.
   */
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

  /**
   * Manipula o envio do formulário de checklist (o teste em si).
   * Coleta todos os resultados, formata o objeto `testResult` e
   * o envia para a API através da função `addTestResult`.
   * @param e - O evento do formulário.
   */
  const handleChecklistSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tipo = currentTest.equipamento.equipment_type;
    const testClass = testClasses.find(tc => tc.name === tipo);

    if (!testClass) {
      alert("Erro: Classe de teste não encontrada!");
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
    setCurrentTest(null); // Reseta para o formulário de identificação
  };

  // --- Renderização condicional ---

  // Estado 1: Nenhum lote ativo selecionado
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

  // Lógica para buscar o nome do lote ativo
  const activeLote = lotes.find(lote => lote.id === activeLoteId);
  const loteName = activeLote ? activeLote.name : activeLoteId; // Fallback para ID

  // Estado 2: Lote ativo, aguardando identificação do equipamento
  if (!currentTest) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Adicionar Equipamento ao Lote</h2>
        <div className="bg-purple-600 text-white p-3 rounded-md text-center font-bold mb-6">
          Lote Ativo: {loteName}
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
  
  // Busca o nome do lote novamente (para este escopo de renderização)
  const activeLoteName = lotes.find(lote => lote.id === activeLoteId)?.name || activeLoteId;
  const testClass = testClasses.find(tc => tc.name === currentTest.equipamento.equipment_type);

  // Estado 3: Checklist de teste em andamento
  return (
     <div>
        <h2 className="text-2xl font-bold text-white mb-4">Checklist de Testes</h2>
        <div className="bg-purple-900 border-l-4 border-purple-500 text-purple-200 p-4 mb-6 rounded-md">
            <p><strong className="font-bold">Lote:</strong> {activeLoteName}</p>
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