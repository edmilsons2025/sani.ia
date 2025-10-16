'use client'

import React, { useState, useCallback } from 'react';

// Define a estrutura esperada para o resultado do NCM
interface NcmResult {
  ncm: string;
  descricao: string;
  score: number;
  source: string;
}

interface ApiResponse {
  query: string;
  method: string;
  count: number;
  results: NcmResult[];
}

/**
 * Componente para buscar e exibir NCMs utilizando a API interna.
 */
export const NcmSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<NcmResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setResults(null);
      setError('Por favor, digite uma palavra-chave.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 1. CHAMA O ENDPOINT DA API
      const url = `/api/ncm-search?description=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url);

      if (!response.ok) {
        // Trata erros HTTP, como o 500 ou 400
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      // 2. PROCESSA A RESPOSTA
      const data: ApiResponse = await response.json();
      setResults(data.results);

    } catch (err: any) {
      console.error('Erro na busca:', err);
      setResults([]); // Limpa resultados anteriores
      setError(err.message || 'Erro ao comunicar com a API de busca.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Buscador de NCM</h1>
        <p className="text-gray-600 mb-6">
          Digite uma descrição de produto para encontrar o NCM correspondente usando nosso modelo híbrido.
        </p>

        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: celular, monitor, leite em pó, pneu de bicicleta..."
            className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150 ease-in-out text-gray-900 placeholder:text-gray-400"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Buscar'}
          </button>
        </div>

        {/* Exibição de Erros */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-900 px-4 py-3 rounded-md relative mb-4" role="alert">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline font-medium">{error}</span>
          </div>
        )}

        {/* Exibição de Resultados */}
        {results && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Resultados Encontrados ({results.length})
            </h2>
            {results.length > 0 ? (
              <ul className="space-y-4">
                {results.map((item, index) => (
                  <li 
                    key={index} 
                    className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
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
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhum resultado encontrado para "{searchTerm}". Tente usar outros termos.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};