'use client';

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
 * Define as propriedades esperadas pelo componente LotesPage.
 */
interface LotesPageProps {
  /**
   * Contém os dados e funções de manipulação de estado
   * fornecidos pelo componente pai.
   */
  testData?: {
    /** A lista de lotes existentes. */
    lotes: Lote[];
    /** * Função para criar um novo lote.
     * @param loteName O nome gerado para o novo lote.
     * @returns Uma promessa que resolve para o lote recém-criado.
     */
    createNewLote: (loteName: string) => Promise<Lote | void>;
    /** Função para definir o ID do lote ativo globalmente. */
    setActiveLoteId: (loteId: string) => void;
    /**
     * Função para atualizar o status de um lote.
     * @param loteId O ID do lote a ser atualizado.
     * @param status O novo status ('Aberto' ou 'Finalizado').
     */
    updateLoteStatus: (loteId: string, status: string) => Promise<void>;
    /**
     * Função para excluir um lote.
     * @param loteId O ID do lote a ser excluído.
     */
    deleteLote: (loteId: string) => Promise<void>;
  };
  /**
   * Função para alterar a visualização ativa na página principal (ex: 'testes').
   */
  setActiveView: (view: string) => void;
}

// --- COMPONENTE ---

/**
 * Componente LotesPage
 * * Responsável por renderizar a interface de gerenciamento de lotes.
 * Permite ao usuário criar, selecionar, finalizar/reabrir e excluir lotes de teste.
 * * @param {LotesPageProps} props - As propriedades do componente.
 * @returns {JSX.Element} O componente LotesPage renderizado.
 */
export default function LotesPage({ testData, setActiveView }: LotesPageProps) {
  
  /**
   * Cláusula de guarda (Guard Clause):
   * Renderiza um estado de carregamento se os dados de teste (`testData`)
   * ainda não estiverem disponíveis.
   */
  if (!testData) {
    return <p className="text-center text-gray-400">Carregando dados dos lotes...</p>;
  }

  const { lotes, createNewLote, setActiveLoteId, updateLoteStatus, deleteLote } = testData;

  // --- FUNÇÕES HANDLER ---

  /**
   * Define o lote selecionado como ativo e navega para a visualização de 'testes'.
   * @param loteId - O ID (string) do lote a ser selecionado.
   */
  const handleSelectLote = (loteId: string) => {
    setActiveLoteId(loteId);
    setActiveView('testes');
  };

  /**
   * Gera um nome de lote padronizado (DDMMAAAAXXX) e solicita a criação
   * de um novo lote. Em caso de sucesso, navega para a página de testes.
   */
  const handleCreateNewLote = async () => {
    try {
      // 1. Gerar o prefixo da data DDMMAAAA
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
      const aaaa = today.getFullYear();
      const datePrefix = `${dd}${mm}${aaaa}`;

      // 2. Encontrar o último contador para o dia atual
      const lotesDeHoje = lotes.filter(lote => lote.name.startsWith(datePrefix));
      let maxCounter = 0;
      
      lotesDeHoje.forEach(lote => {
        const counterStr = lote.name.substring(datePrefix.length);
        const counter = parseInt(counterStr, 10);
        if (!isNaN(counter) && counter > maxCounter) {
          maxCounter = counter;
        }
      });

      // 3. Criar o novo nome
      const newCounter = maxCounter + 1;
      const newCounterStr = String(newCounter).padStart(3, '0'); // Formata como "001"
      const novoNomeDoLote = `${datePrefix}${newCounterStr}`;

      console.log(`[LotesPage] Tentando criar lote: ${novoNomeDoLote}`);
      const novoLote = await createNewLote(novoNomeDoLote);

      // 4. Navegar para a página de testes com o lote recém-criado
      if (novoLote && novoLote.id) {
        console.log(`[LotesPage] Lote ${novoLote.id} criado. Navegando para 'testes'.`);
        handleSelectLote(novoLote.id);
      } else {
        console.warn("[LotesPage] A função createNewLote não retornou um lote válido.");
        alert("O lote foi criado, mas houve um problema ao navegar. Por favor, selecione-o manualmente.");
      }
    } catch (error) {
      console.error("[LotesPage] Falha ao criar novo lote:", error);
      alert("Erro ao criar o lote. Verifique o console (F12) para mais detalhes.");
    }
  };

  /**
   * Manipula a alternância de status de um lote (Aberto <-> Finalizado).
   * @param loteId - O ID do lote a ser atualizado.
   * @param novoStatus - O novo status para o lote ('Aberto' ou 'Finalizado').
   */
  const handleUpdateStatus = async (loteId: string, novoStatus: string) => {
    try {
      console.log(`[LotesPage] Atualizando status do lote ${loteId} para: ${novoStatus}`);
      await updateLoteStatus(loteId, novoStatus);
      console.log(`[LotesPage] Status do lote ${loteId} atualizado com sucesso.`);
    } catch (error) {
      console.error(`[LotesPage] Falha ao atualizar status do lote ${loteId}:`, error);
      alert("Erro ao atualizar o status do lote. Verifique o console.");
    }
  };

  /**
   * Solicita a exclusão de um lote após a confirmação do usuário.
   * @param lote - O objeto Lote a ser excluído.
   */
  const handleDeleteLote = async (lote: Lote) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o lote "${lote.name}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      console.log(`[LotesPage] Tentando excluir lote: ${lote.id}`);
      await deleteLote(lote.id);
      console.log(`[LotesPage] Lote ${lote.id} excluído com sucesso.`);
    } catch (error) {
      console.error(`[LotesPage] Falha ao excluir o lote ${lote.id}:`, error);
      alert("Erro ao excluir o lote. Verifique o console para mais detalhes.");
    }
  };

  // --- RENDERIZAÇÃO ---

  return (
    <div className="bg-gray-900 text-white p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Gerenciar Lotes de Teste</h2>

      {/* Seção para criação de um novo lote */}
      <div className="mb-8">
        <button
          onClick={handleCreateNewLote}
          className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          Criar Novo Lote e Iniciar
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
                className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-gray-800 border border-gray-700 rounded-md"
              >
                {/* Informações do Lote */}
                <div className="mb-4 sm:mb-0">
                  <span className="font-medium text-gray-200">{lote.name}</span>
                  <span className={`ml-4 text-xs font-semibold px-2 py-1 rounded-full ${
                    lote.status === 'Aberto' 
                      ? 'bg-green-600 text-green-100' 
                      : 'bg-red-600 text-red-100'
                  }`}>
                    {lote.status}
                  </span>
                </div>
                
                {/* Botões de Ação */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSelectLote(lote.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    disabled={lote.status === 'Finalizado'}
                  >
                    Selecionar Lote
                  </button>
                  
                  {lote.status === 'Aberto' ? (
                    <button
                      onClick={() => handleUpdateStatus(lote.id, 'Finalizado')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-red-700"
                    >
                      Finalizar Lote
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(lote.id, 'Aberto')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700"
                    >
                      Reabrir Lote
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteLote(lote)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-gray-200 text-sm font-semibold rounded-md shadow-sm hover:bg-gray-500"
                  >
                    Excluir
                  </button>
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