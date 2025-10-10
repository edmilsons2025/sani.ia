"use client"

import React, { useState } from 'react';

// Define a estrutura esperada para o resultado do NCM
// Note que o backend retorna 'ncm' e 'descricao'
interface NcmResult {
  ncm: string;
  descricao: string;
}

interface ApiResponse {
  query: string;
  count: number;
  results: NcmResult[];
}

/**
 * Componente simples para testar a busca de NCM via API.
 */
const NcmSearchTest: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<NcmResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setResults(null);
      setError('Por favor, digite uma palavra-chave.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 1. CHAMA O ENDPOINT DA API
      // CORREÇÃO: Parâmetro da URL mudado de 'name' para 'description'
      const url = `/api/ncm-search?description=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url);

      if (!response.ok) {
        // Trata erros HTTP, como o 500 ou 400
        const errorData = await response.json();
        // A mensagem de erro da API agora é mais informativa
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      // 2. PROCESSA A RESPOSTA
      const data: ApiResponse = await response.json();
      setResults(data.results);

    } catch (err: unknown) { // CORREÇÃO DE LINTING: Usando 'unknown' em vez de 'any'
      const e = err as Error; // Coerção segura para acessar a propriedade 'message'
      console.error('Erro na busca:', e);
      setResults([]); // Limpa resultados anteriores
      setError(e.message || 'Erro ao comunicar com a API de busca.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Buscador de NCM (Teste)</h1>
      <p>Testa o módulo **NCM Collector** usando Fuzzy Search.</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Ex: celular, monitor, leite"
          style={{ padding: '10px', flexGrow: 1, border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{ padding: '10px 20px', background: loading ? '#ccc' : '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Buscando...' : 'Buscar NCM'}
        </button>
      </div>

      {/* Exibição de Erros */}
      {error && <div style={{ color: 'red', marginBottom: '15px', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>**Erro:** {error}</div>}

      {/* Exibição de Resultados */}
      {results && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <h2>Resultados Encontrados ({results.length})</h2>
          {results.length > 0 ? (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {results.map((item, index) => (
                <li 
                  key={index} 
                  style={{ 
                    border: '1px solid #ddd', 
                    padding: '10px', 
                    marginBottom: '8px', 
                    borderRadius: '4px',
                    background: '#f9f9f9'
                  }}
                >
                  {/* ATUALIZAÇÃO DE PROPRIEDADES: Usando 'ncm' e 'descricao' do backend */}
                  <p style={{ margin: 0 }}>**NCM:** <code style={{ fontWeight: 'bold' }}>{item.ncm}</code></p>
                  <p style={{ margin: 0, fontSize: '0.9em' }}>**Descrição:** {item.descricao}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum resultado encontrado para &quot;{searchTerm}&quot;.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NcmSearchTest;
