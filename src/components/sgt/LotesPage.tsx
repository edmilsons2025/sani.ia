'use client';

// --- DEFINIÇÕES DE TIPO ---

interface Lote {
  id: number;
  name: string;
  status: string;
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
    lotes: Lote[];
    createNewLote: () => void;
    setActiveLoteId: (loteId: string) => void;
    updateLoteStatus: (loteId: number, status: string) => void;
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
    return <p className="text-center text-gray-400">Carregando dados dos lotes...</p>;
  }

  /**
   * Desestruturação das propriedades de `testData` para facilitar o acesso.
   */
  const { lotes, createNewLote, setActiveLoteId, updateLoteStatus } = testData;

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
    <div className="bg-gray-900 text-white p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Gerenciar Lotes de Teste</h2>

      {/* Seção para criação de um novo lote */}
      <div className="mb-8">
        <button
          onClick={createNewLote}
          className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700"
        >
          Criar Novo Lote
        </button>
      </div>

      {/* Seção para listar e selecionar lotes existentes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Lotes Existentes</h3>
        {lotes.length > 0 ? (
          <ul className="space-y-2">
            {lotes.map((lote: Lote) => (
              <li
                key={lote.id}
                className="flex justify-between items-center p-4 bg-gray-800 border border-gray-700 rounded-md"
              >
                <div>
                  <span className="font-medium text-gray-200">{lote.name}</span>
                  <span className={`ml-4 text-xs font-semibold px-2 py-1 rounded-full ${lote.status === 'Aberto' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {lote.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectLote(lote.id.toString())}
                    className="px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-purple-600 disabled:bg-gray-600"
                    disabled={lote.status === 'Finalizado'}
                  >
                    Selecionar Lote
                  </button>
                  {lote.status === 'Aberto' ? (
                    <button
                      onClick={() => updateLoteStatus(lote.id, 'Finalizado')}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-red-700"
                    >
                      Finalizar Lote
                    </button>
                  ) : (
                    <button
                      onClick={() => updateLoteStatus(lote.id, 'Aberto')}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700"
                    >
                      Reabrir Lote
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Nenhum lote criado ainda.</p>
        )}
      </div>
    </div>
  );
}
