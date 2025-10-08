'use client';

import { useState } from 'react';

export function DocxUploader() {
  // Estado para o processamento inicial do arquivo
  const [originalHtml, setOriginalHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estado para o processo de tradução
  const [targetLanguage, setTargetLanguage] = useState('Português do Brasil');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);

  // Função para lidar com o upload e conversão para HTML
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setOriginalHtml(null); // Limpa a pré-visualização anterior
    setTranslatedHtml(null); // Limpa a tradução anterior

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/docx-to-html', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro desconhecido ao processar arquivo');
      }
      
      setOriginalHtml(data.html);

    } catch (error) {
      console.error('Falha no upload:', error);
      alert(`Erro ao processar o arquivo: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para chamar a API de tradução
  const handleTranslate = async () => {
    if (!originalHtml) return;

    setIsTranslating(true);
    setTranslatedHtml(null);

    try {
      const response = await fetch('/api/translate-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: originalHtml,
          language: targetLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro na tradução');
      }

      setTranslatedHtml(data.translatedHtml);

    } catch (error) {
      console.error('Falha na tradução:', error);
      alert(`Erro ao traduzir: ${(error as Error).message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">Sani.IA - Tradutor de Documentos</h1>
      <p className="mb-6 text-gray-600">Faça o upload de um arquivo .docx para extrair, visualizar e traduzir seu conteúdo.</p>
      
      <input 
        type="file" 
        accept=".docx" 
        onChange={handleFileChange} 
        disabled={isLoading || isTranslating}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
      />

      {isLoading && <p className="mt-4 text-violet-700">Processando arquivo, por favor aguarde...</p>}

      {originalHtml && (
        <>
          {/* Seção de Controles de Tradução */}
          <div className="my-6 p-4 border rounded-lg bg-white shadow-sm flex items-center gap-4 flex-wrap">
            <label htmlFor="language-select" className="font-semibold text-gray-700">Traduzir para:</label>
            <select
              id="language-select"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={isTranslating}
              className="flex-grow max-w-xs p-2 border border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500"
            >
              <option>Português do Brasil</option>
              <option>English</option>
              <option>Español</option>
              <option>中文 (Chinês)</option>
              <option>日本語 (Japonês)</option>
              <option>Français (Francês)</option>
              <option>Deutsch (Alemão)</option>
            </select>
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="px-6 py-2 bg-violet-600 text-white font-semibold rounded-md hover:bg-violet-700 disabled:bg-gray-400"
            >
              {isTranslating ? 'Traduzindo...' : 'Traduzir'}
            </button>
          </div>

          {/* Seção de Pré-visualização do Original */}
          <div className="border rounded-lg p-6 bg-white shadow-md">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Documento Original</h2>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: originalHtml }} 
            />
          </div>
          
          {/* Seção de Resultado da Tradução */}
          {translatedHtml && (
            <div className="border rounded-lg p-6 mt-8 bg-white shadow-md">
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Documento Traduzido</h2>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: translatedHtml }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
