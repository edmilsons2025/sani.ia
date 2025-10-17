'use client';

// --- DEFINIÇÕES DE TIPO ---

/**
 * @interface Equipamento
 * @description Define a estrutura básica de um equipamento em teste.
 */
interface Equipamento {
  lote_id: string;
}

/**
 * @interface TestResult
 * @description Define a estrutura de um resultado de teste completo.
 */
interface TestResult {
  equipamento: Equipamento;
}

/**
 * @interface LotesPageProps
 * @description Define as propriedades esperadas pelo componente LotesPage.
 */
interface LotesPageProps {
  /**
   * @property testData - Um objeto opcional contendo os dados e funções para manipulação dos testes.
   */
  testData?: {
    allTests: TestResult[];
    createNewLote: () => void;
    setActiveLoteId: (loteId: string) => void;
  };
  /**
   * @property setActiveView - Função para alterar a visualização ativa na página principal.
   */
  setActiveView: (view: string) => void;
}

/**
 * @component LotesPage
 * @description Componente responsável por gerenciar a criação e seleção de lotes de teste.
 *
 * @param {LotesPageProps} props - As propriedades do componente.
 * @returns {JSX.Element} O componente LotesPage renderizado.
 */
export default function LotesPage({ testData, setActiveView }: LotesPageProps) {
  /**
   * Cláusula de guarda (Guard Clause):
   * Renderiza um estado de carregamento se os dados de teste (`testData`) ainda não estiverem disponíveis.
   */
  if (!testData) {
    return <p className="text-center text-gray-500">Carregando dados dos lotes...</p>;
  }

  /**
   * Desestruturação das propriedades de `testData` para facilitar o acesso.
   */
  const { allTests, createNewLote, setActiveLoteId } = testData;

  /**
   * Deriva uma lista de IDs de lotes únicos a partir de todos os testes registrados.
   */
  const lotes = [...new Set(allTests.map((t: TestResult) => t.equipamento.lote_id))].sort().reverse();

  /**
   * @function handleSelectLote
   * @description Define o lote ativo e navega para a página de testes.
   * @param {string} loteId - O ID do lote a ser selecionado.
   */
  const handleSelectLote = (loteId: string) => {
    setActiveLoteId(loteId);
    setActiveView('testes');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gerenciar Lotes de Teste</h2>

      {/* Seção para criação de um novo lote */}
      <div className="mb-8">
        <button
          onClick={createNewLote}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700"
        >
          Criar Novo Lote
        </button>
      </div>

      {/* Seção para listar e selecionar lotes existentes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Lotes Existentes</h3>
        {lotes.length > 0 ? (
          <ul className="space-y-2">
            {lotes.map((loteId: string) => (
              <li
                key={loteId}
                className="flex justify-between items-center p-4 bg-white border rounded-md"
              >
                <span className="font-medium text-gray-800">{loteId}</span>
                <button
                  onClick={() => handleSelectLote(loteId)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700"
                >
                  Selecionar Lote
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Nenhum lote criado ainda.</p>
        )}
      </div>
    </div>
  );
}

