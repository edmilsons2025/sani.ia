// NcmSearch.tsx
'use client'

import React, { useState, useCallback } from 'react';

// --- Tipagem ---

/**
 * Define a estrutura de um único resultado de NCM retornado pela API.
 */
interface NcmResult {
  ncm: string;
  descricao: string;
  score: number;
  source: string;
}

/**
 * Define a estrutura completa da resposta da API de busca.
 */
interface ApiResponse {
  query: string;
  method: string;
  count: number;
  results: NcmResult[];
}

/**
 * Ícone de carregamento (spinner) para botões.
 */
const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


/**
 * Componente principal para buscar, exibir e sugerir classificações de NCM.
 * Oferece uma busca inicial baseada em IA e um fluxo de busca manual como fallback,
 * permitindo que os usuários enviem feedback para aprimorar o sistema.
 */
export const NcmSearch: React.FC = () => {
  // --- Estados da Busca Principal ---
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<NcmResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Estados da Busca Manual e Seleção ---
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [manualResults, setManualResults] = useState<NcmResult[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  
  // --- Estados de Controle de Seleção e Feedback ---
  const [selectedNcm, setSelectedNcm] = useState<NcmResult | null>(null);
  const [notFoundChecked, setNotFoundChecked] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  /**
   * Reseta os estados relacionados à busca manual e à seleção final.
   * Chamado ao iniciar uma nova busca principal para limpar a UI.
   */
  const resetSecondaryStates = () => {
    setShowManualSearch(false);
    setManualSearchTerm('');
    setManualResults([]);
    setManualError(null);
    setSelectedNcm(null);
    setNotFoundChecked(false);
    setSuggestionStatus('idle');
  };
  
  /**
   * Executa a busca principal contra o endpoint da API.
   */
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Por favor, digite uma palavra-chave.');
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    resetSecondaryStates();
    
    try {
      const url = `/api/ncm-search?description=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setResults(data.results);
    } catch (err: any) {
      console.error('Erro na busca inicial:', err);
      setResults([]);
      setError(err.message || 'Erro ao comunicar com a API de busca.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  /**
   * Executa a busca manual, utilizada como fallback pelo usuário.
   */
  const handleManualSearch = useCallback(async () => {
    if (!manualSearchTerm.trim()) {
      setManualError('Digite uma descrição para a busca manual.');
      return;
    }
    
    setManualLoading(true);
    setManualError(null);
    
    try {
      const url = `/api/ncm-search?description=${encodeURIComponent(manualSearchTerm)}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setManualResults(data.results);
    } catch (err: any) {
      console.error('Erro na busca manual:', err);
      setManualResults([]);
      setManualError(err.message || 'Erro ao buscar manualmente.');
    } finally {
      setManualLoading(false);
    }
  }, [manualSearchTerm]);

  /**
   * Define o NCM selecionado pelo usuário e limpa estados conflitantes.
   * @param ncm O objeto NcmResult selecionado.
   */
  const handleSelectNcm = (ncm: NcmResult) => {
    setSelectedNcm(ncm);
    setNotFoundChecked(false);
    setSuggestionStatus('idle'); // Reseta para permitir nova sugestão se a seleção mudar.
  };
  
  /**
   * Controla o estado do checkbox "Não encontrei nenhuma opção adequada".
   * @param e O evento de mudança do input.
   */
  const handleNotFoundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setNotFoundChecked(isChecked);
    if (isChecked) {
      setSelectedNcm(null); // Garante que não há NCM selecionado se esta opção for marcada.
    }
  };

  /**
   * Envia a classificação selecionada pelo usuário como uma sugestão para o backend.
   */
  const handleSuggestionSubmit = useCallback(async () => {
    if (!selectedNcm || !searchTerm) return;

    setSuggestionStatus('submitting');
    
    try {
      const response = await fetch('/api/ncm-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_query: searchTerm,
          ncm: selectedNcm.ncm,
          descricao: selectedNcm.descricao,
        }),
      });

      if (!response.ok) throw new Error('Falha no servidor ao enviar a sugestão.');
      
      setSuggestionStatus('success');
    } catch (err) {
      console.error("Erro ao enviar sugestão:", err);
      setSuggestionStatus('error');
    }
  }, [selectedNcm, searchTerm]);


  /**
   * Renderiza uma lista de resultados de NCM.
   * @param list A lista de NCMs a ser renderizada.
   * @param onSelect A função a ser chamada quando um item é selecionado.
   */
  const renderResultsList = (list: NcmResult[], onSelect: (ncm: NcmResult) => void) => (
     <ul className="space-y-4">
      {list.map((item, index) => {
        const isSelected = selectedNcm?.ncm === item.ncm && selectedNcm?.descricao === item.descricao;
        return (
          <li 
            key={`${item.ncm}-${index}`}
            onClick={() => onSelect(item)}
            className={`bg-white border p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">NCM</p>
                <code className="text-lg font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                  {item.ncm}
                </code>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Score</p>
                <span className={`font-bold ${item.score > 0.8 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {item.score.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">Descrição</p>
            <p className="text-gray-700">{item.descricao}</p>
            <p className="mt-3 text-xs text-gray-400 text-right">
              Fonte: {item.source}
            </p>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Buscador de NCM</h1>
        <p className="text-gray-600 mb-6">
          Digite uma descrição de produto para encontrar o NCM correspondente.
        </p>

        {/* --- Barra de Busca Principal --- */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: celular, monitor, leite em pó..."
            className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <LoadingSpinner /> : 'Buscar'}
          </button>
        </div>

        {/* --- Exibição de Erros da Busca Principal --- */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-900 px-4 py-3 rounded-md mb-4" role="alert">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline font-medium">{error}</span>
          </div>
        )}

        {/* --- Seção de Resultados da Busca Principal --- */}
        {results && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Resultados Sugeridos ({results.length})
            </h2>
            {results.length > 0 ? (
                renderResultsList(results, handleSelectNcm)
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhum resultado encontrado para "{searchTerm}".
              </p>
            )}
            <div className="mt-6 text-center">
                <button
                    onClick={() => setShowManualSearch(!showManualSearch)}
                    className="px-5 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-100 transition-colors"
                >
                    {showManualSearch ? 'Ocultar Busca Manual' : 'Não encontrou? Busque manualmente'}
                </button>
            </div>
          </div>
        )}

        {/* --- Seção de Busca Manual (condicional) --- */}
        {showManualSearch && (
            <div className="border-t border-dashed border-gray-300 pt-6 mt-6">
                 <h2 className="text-2xl font-semibold text-gray-700 mb-4">Busca Manual</h2>
                 <p className="text-gray-600 mb-4">Digite um termo mais específico para refinar sua busca.</p>
                <div className="flex items-center gap-3 mb-4">
                    <input
                        type="text"
                        value={manualSearchTerm}
                        onChange={(e) => setManualSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                        placeholder="Ex: Parafuso de aço, Placa de circuito..."
                        className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-200"
                        disabled={notFoundChecked}
                    />
                    <button
                        onClick={handleManualSearch}
                        disabled={manualLoading || notFoundChecked}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {manualLoading ? <LoadingSpinner /> : 'Buscar'}
                    </button>
                </div>
                <div className="flex items-center my-4">
                    <input id="notFound" type="checkbox" checked={notFoundChecked} onChange={handleNotFoundChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <label htmlFor="notFound" className="ml-2 block text-sm text-gray-900">Não encontrei nenhuma opção adequada</label>
                </div>
                {manualError && <p className="text-red-600">{manualError}</p>}
                {manualResults.length > 0 && !notFoundChecked && renderResultsList(manualResults, handleSelectNcm)}
            </div>
        )}
        
        {/* --- Seção de Seleção Final e Sugestão --- */}
        {(selectedNcm || notFoundChecked) && (
            <div className="mt-8 p-4 bg-gray-100 border border-gray-200 rounded-lg">
                <h3 className="font-bold text-lg text-gray-800 mb-2">Seleção Final:</h3>
                {notFoundChecked ? (
                    <p className="text-red-700 font-semibold">N/A (Nenhuma opção adequada foi encontrada)</p>
                ) : selectedNcm ? (
                    <div>
                        <p><span className="font-semibold">NCM:</span> {selectedNcm.ncm}</p>
                        <p><span className="font-semibold">Descrição:</span> {selectedNcm.descricao}</p>
                        
                        <div className="mt-4 border-t pt-4">
                           {suggestionStatus === 'idle' && (
                             <>
                               <p className="text-sm text-gray-600 mb-2">Esta é a classificação correta para "<b>{searchTerm}</b>"? Ajude-nos a melhorar.</p>
                               <button onClick={handleSuggestionSubmit} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md shadow-sm hover:bg-emerald-700">
                                 Sugerir esta classificação
                               </button>
                             </>
                           )}
                           {suggestionStatus === 'submitting' && <p className="text-blue-700 font-semibold">Enviando sugestão...</p>}
                           {suggestionStatus === 'success' && <p className="text-green-700 font-bold">✅ Obrigado! Sua sugestão foi enviada para análise.</p>}
                           {suggestionStatus === 'error' && <p className="text-red-700 font-bold">❌ Erro ao enviar. Tente novamente.</p>}
                        </div>
                    </div>
                ) : null}
            </div>
        )}
      </div>
    </div>
  );
};