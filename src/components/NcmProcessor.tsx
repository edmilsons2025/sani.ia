'use client';

import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { NcmService, NcmResultFromApi } from '@/services/NcmService';
import { useDebugLog } from '@/hooks/useDebugLog';

// --- Tipos de Dados ---

type Step = 'upload' | 'sheet_select' | 'header_line' | 'mapping' | 'review' | 'done';
interface ProcessingResult {
  rowIndex: number;
  query: string;
  originalRow: any;
  ncmResults: NcmResultFromApi[];
}

// --- Componente Principal ---

export const NcmProcessor: React.FC = () => {
  const { log, warn, error: logError } = useDebugLog('NcmProcessor');

  // --- Estados de Dados ---
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [rawSheetData, setRawSheetData] = useState<any[][]>([]);
  const [headerLineIndex, setHeaderLineIndex] = useState<number | null>(null);

  // --- Estados de Mapeamento e Processamento ---
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [sourceColumn, setSourceColumn] = useState<string>('');
  const [destinationColumn, setDestinationColumn] = useState<string>('');

  // --- Estados de UI e Fluxo ---
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Estados dos Resultados e Seleções ---
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [userSelections, setUserSelections] = useState<Record<number, string>>({});

  // Função de Reset
  const resetState = useCallback(() => {
    log('Estado do componente resetado.');
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheetName('');
    setRawSheetData([]);
    setHeaderLineIndex(null);
    setHeaders([]);
    setSheetData([]);
    setSourceColumn('');
    setDestinationColumn('');
    setProcessingResults([]);
    setUserSelections({});
    setStep('upload');
    setError(null);
  }, [log]);

  // --- 1. Upload do Arquivo (Carrega Workbook e Abas) ---
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    log(`Arquivo selecionado: ${selectedFile.name}`);

    setIsLoading(true);
    setError(null);
    setFile(selectedFile);
    setStep('upload');

    try {
      const data = await selectedFile.arrayBuffer();
      const newWorkbook = XLSX.read(data, { type: 'buffer' });
      const newSheetNames = newWorkbook.SheetNames;

      log('Workbook lido com sucesso. Abas encontradas:', newSheetNames);
      if (newSheetNames.length === 0) {
        throw new Error('O arquivo não contém abas (sheets).');
      }

      setWorkbook(newWorkbook);
      setSheetNames(newSheetNames);
      setSelectedSheetName(newSheetNames[0]);

      if (newSheetNames.length > 1) {
        setStep('sheet_select');
      } else {
        handleSheetSelection(newWorkbook, newSheetNames[0]);
      }

    } catch (err: any) {
      logError('Erro ao ler o arquivo:', err);
      setError(`Erro ao ler o arquivo: ${err.message}`);
      setStep('upload');
    } finally {
      setIsLoading(false);
    }
  }, [log, logError]); // Adicionado `log`, `logError` à lista de dependências

  // --- 2. Seleção de Aba (Sheet) ---
  const handleSheetSelection = useCallback((currentWorkbook: XLSX.WorkBook, sheetName: string) => {
    log(`Aba selecionada: "${sheetName}"`); const worksheet = currentWorkbook.Sheets[sheetName];
    if (!worksheet) {
      logError(`Aba "${sheetName}" não encontrada no workbook.`); setError(`Aba "${sheetName}" não encontrada no workbook.`);
      setStep('upload');
      return;
    }

    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    log(`Dados brutos da aba extraídos. Total de linhas: ${rawData.length}`);
    if (rawData.length < 1) {
      setError('A aba selecionada está vazia ou em um formato inválido.');
      setStep('upload');
      return;
    }

    setRawSheetData(rawData);
    setHeaderLineIndex(1);
    setStep('header_line');
    setError(null);
  }, [log, logError]);


  // --- 3. Seleção da Linha de Cabeçalho (CORRIGIDA) ---
  const handleHeaderLineSelection = useCallback(() => {
    if (headerLineIndex === null || headerLineIndex < 1 || headerLineIndex > rawSheetData.length) {
      setError('Selecione uma linha válida para o cabeçalho.');
      return;
    }

    log(`Linha de cabeçalho selecionada: ${headerLineIndex}`);

    const headerArrayIndex = headerLineIndex - 1;
    const sheetHeaders: string[] = (rawSheetData[headerArrayIndex] as any[])
      .map(header => String(header ?? '').trim())
      .filter(h => h.length > 0);

    if (sheetHeaders.length === 0) {
      setError('A linha selecionada não contém cabeçalhos válidos.');
      return;
    }

    log('Cabeçalhos extraídos e limpos:', sheetHeaders);

    const firstDataRowIndex = headerArrayIndex + 1;
    const dataRows = rawSheetData.slice(firstDataRowIndex);

    // --- NOVA CORREÇÃO: Filtrar linhas vazias ---
    // Uma linha é considerada "vazia" se todas as suas células são nulas, indefinidas ou strings vazias.
    const nonEmptyDataRows = dataRows.filter(row =>
      row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );
    // ---------------------------------------------

    // Agora, usamos 'nonEmptyDataRows' para o processamento
    const processedData = nonEmptyDataRows.map(row => {
      const obj: any = {};
      sheetHeaders.forEach((header, index) => {
        if (header) obj[header] = row[index];
      });
      return obj;
    });

    log(`Dados processados em objetos. Total de itens: ${processedData.length}. Exemplo do primeiro item:`, processedData[0] || 'Nenhum dado válido encontrado.');

    setHeaders(sheetHeaders);
    setSheetData(processedData);

    const suggestedSource = sheetHeaders.find(h => /produto|descri(c|ç)(a|ã)o/i.test(h)) || sheetHeaders[0];
    const suggestedDest = sheetHeaders.find(h => /ncm/i.test(h));
    setSourceColumn(suggestedSource);
    setDestinationColumn((suggestedDest && suggestedDest !== suggestedSource) ? suggestedDest : '');

    log(`Colunas sugeridas -> Origem: "${suggestedSource}", Destino: "${suggestedDest || ''}"`);

    setStep('mapping');
    setError(null);
  }, [headerLineIndex, rawSheetData, log]);

  // --- 4. Funções de Busca e Processamento (CORRIGIDA) ---
  const handleStartProcessing = useCallback(async () => {
    if (!sourceColumn || !destinationColumn) {
      setError('Por favor, selecione a coluna de origem e a de destino.');
      return;
    }
    if (sourceColumn === destinationColumn) {
      setError('A coluna de origem e de destino não podem ser a mesma.');
      return;
    }
    if (sheetData.length === 0) {
      setError('Nenhum dado encontrado para processamento. Verifique se a linha do cabeçalho está correta.');
      return;
    }
    if (!sheetData[0].hasOwnProperty(sourceColumn)) {
      logError(`A coluna de origem "${sourceColumn}" não foi encontrada no objeto de dados. Chaves disponíveis:`, Object.keys(sheetData[0]));
      setError(`A coluna de origem "${sourceColumn}" não foi encontrada nos dados da planilha. Verifique o cabeçalho e tente novamente.`);
      return;
    }

    log(`Iniciando processamento. Origem: "${sourceColumn}", Destino: "${destinationColumn}"`);

    setIsProcessing(true);
    setError(null);
    const ncmService = NcmService.getInstance();
    const results: ProcessingResult[] = [];
    let criticalApiError = false;

    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];

      // 1. Converte para string. 
      // 2. O '?? ""' protege contra células nulas ou indefinidas.
      // 3. O '.trim()' remove espaços em branco inúteis.
      const query = String(row[sourceColumn] ?? "").trim();

      // A validação é mais simples e segura, pois 'query' é garantidamente uma string.
      if (query.length < 3) {
        warn(`Linha ${i + 1}: Query inválida ou muito curta ('${query}'). Item será ignorado.`);
        results.push({
          rowIndex: i,
          query: query || 'Valor Nulo/Inválido',
          originalRow: row,
          ncmResults: [],
        });
        continue;
      }

      log(`Buscando NCM para a query [${i + 1}/${sheetData.length}]: "${query}"`);

      try {
        // Chamada para a API
        const ncmResults = await ncmService.search(query);
        log(`Sucesso para "${query}". Resultados encontrados:`, ncmResults);
        results.push({
          rowIndex: i,
          query,
          originalRow: row,
          ncmResults,
        });
      } catch (err: any) {
        logError(`Falha ao buscar NCM para "${query}". Erro:`, err);

        if (i < 5) {
          criticalApiError = true;
          setError(`Falha crítica na conexão com a API NCM. (${err.message}). Verifique o console e a URL da API.`);
          break;
        }

        warn(`Erro pontual para "${query}". O item será ignorado.`);
        results.push({
          rowIndex: i,
          query,
          originalRow: row,
          ncmResults: [],
        });
      }
    }

    setIsProcessing(false);

    if (criticalApiError) {
      logError('Processamento interrompido devido a erro crítico de API.');
      return;
    }

    if (results.length > 0) {
      log('Processamento concluído. Total de resultados:', results); setProcessingResults(results);
      setStep('review');
    } else {
      warn('O processamento terminou sem resultados.');
      setError('O processamento não retornou resultados válidos. Verifique as configurações de coluna e os dados da planilha.');
      setStep('mapping');
    }
  }, [sheetData, sourceColumn, destinationColumn, log, warn, logError]);

  // --- Funções de Interação e Geração ---

  const handleNcmSelection = (rowIndex: number, ncm: string) => {
    setUserSelections(prev => ({
      ...prev,
      [rowIndex]: ncm,
    }));
  };

  const isReviewComplete = useMemo(() => {
    return processingResults.length > 0 && processingResults.every(result =>
      result.ncmResults.length === 0 || userSelections[result.rowIndex]
    );
  }, [processingResults, userSelections]);

  const handleGenerateFile = () => {
    setIsGenerating(true);
    try {
      const finalData = [...sheetData];

      processingResults.forEach(result => {
        const selectedNcm = userSelections[result.rowIndex];
        if (selectedNcm) {
          // Encontra a linha correspondente nos dados originais e atualiza
          const originalIndex = sheetData.indexOf(result.originalRow);
          if (originalIndex !== -1) {
            finalData[originalIndex] = {
              ...finalData[originalIndex],
              [destinationColumn]: selectedNcm,
            };
          }
        }
      });

      const newWorksheet = XLSX.utils.json_to_sheet(finalData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'NCMs Processados');

      const originalFileName = file?.name.replace(/\.(xlsx|xlsm)$/, '') || 'planilha';
      XLSX.writeFile(newWorkbook, `${originalFileName}_com_ncm.xlsx`);

      setStep('done');
    } catch (err: any) {
      setError(`Erro ao gerar o arquivo final: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };


  // --- Renderização do Componente ---

  return (
    <div className="font-sans w-full">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200/80">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Processador de NCM em Lote</h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-900 px-4 py-3 rounded-md my-4" role="alert">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline font-medium">{error}</span>
          </div>
        )}

        {/* Etapa 1: Upload */}
        {step === 'upload' && (
          <div>
            <p className="text-gray-600 mb-6">
              Faça o upload de uma planilha (.xlsx, .xlsm) para buscar e preencher os NCMs automaticamente.
            </p>
            <input
              type="file"
              accept=".xlsx, .xlsm"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
            />
            {isLoading && <p className="mt-4 text-violet-700 animate-pulse">Lendo a planilha...</p>}
          </div>
        )}

        {/* Etapa 2: Seleção de Aba (Sheet) */}
        {step === 'sheet_select' && sheetNames.length > 1 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Selecione a Aba de Dados</h2>
            <p className="text-gray-600 mb-6">
              O arquivo <strong>{file?.name}</strong> contém {sheetNames.length} abas. Por favor, escolha qual aba contém os dados de produtos.
            </p>

            <select
              value={selectedSheetName}
              onChange={e => setSelectedSheetName(e.target.value)}
              className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md bg-white text-lg text-gray-900"
            >
              {sheetNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => workbook && handleSheetSelection(workbook, selectedSheetName)}
                disabled={!selectedSheetName || !workbook}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
              >
                Avançar para Seleção do Cabeçalho
              </button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Etapa 3: Seleção da Linha de Cabeçalho */}
        {step === 'header_line' && rawSheetData.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Onde estão seus cabeçalhos?</h2>
            <p className="text-gray-600 mb-6">
              A aba <strong>{selectedSheetName}</strong> tem {rawSheetData.length} linhas. Insira o número da linha que contém o nome das colunas (Base 1).
            </p>

            <input
              type="number"
              min="1"
              max={rawSheetData.length}
              placeholder="Ex: 1"
              value={headerLineIndex ?? ''}
              onChange={e => setHeaderLineIndex(parseInt(e.target.value) || null)}
              className="w-32 p-2 border border-gray-300 rounded-md bg-white text-center text-lg font-mono"
            />

            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Pré-visualização da Linha {headerLineIndex || '1'} (Valores separados por |):
              </p>
              <div className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                <code className="whitespace-nowrap text-xs">
                  {rawSheetData[(headerLineIndex ?? 1) - 1]?.join(' | ') || 'Nenhuma linha para pré-visualizar.'}
                </code>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={handleHeaderLineSelection}
                disabled={headerLineIndex === null || headerLineIndex < 1 || headerLineIndex > rawSheetData.length}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
              >
                Confirmar Cabeçalhos
              </button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">
                Cancelar
              </button>
            </div>
          </div>
        )}


        {/* Etapa 4: Mapeamento de Colunas */}
        {step === 'mapping' && (
          <div>
            <p className="text-gray-600 mb-4">Planilha <strong>{selectedSheetName}</strong> carregada e cabeçalhos mapeados. Selecione as colunas de trabalho.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="source-col" className="block text-sm font-medium text-gray-700 mb-1">Coluna com a descrição do produto (Origem)</label>
                <select id="source-col" value={sourceColumn} onChange={e => setSourceColumn(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900">
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="dest-col" className="block text-sm font-medium text-gray-700 mb-1">Coluna para preencher o NCM (Destino)</label>
                <select id="dest-col" value={destinationColumn} onChange={e => setDestinationColumn(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900">
                  <option value="">-- Selecione uma coluna --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button onClick={handleStartProcessing} disabled={isProcessing || !sourceColumn || !destinationColumn} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400">
                {isProcessing ? 'Processando...' : 'Iniciar Busca de NCMs'}
              </button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Etapa 5: Revisão */}
        {step === 'review' && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Revise e Selecione os NCMs</h2>
            <p className="text-gray-600 mb-6">Selecione o NCM correto para cada produto. Itens sem resultados ou já selecionados ficarão destacados.</p>
            <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {processingResults.map(result => (
                <li key={result.rowIndex} className={`p-4 rounded-lg border ${userSelections[result.rowIndex] ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                  <p className="font-semibold text-gray-800">Produto: <span className="font-normal text-blue-700">{result.query}</span></p>
                  {result.ncmResults.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {result.ncmResults.map(ncmRes => (
                        <label key={ncmRes.ncm} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                          <input
                            type="radio"
                            name={`ncm-select-${result.rowIndex}`}
                            checked={userSelections[result.rowIndex] === ncmRes.ncm}
                            onChange={() => handleNcmSelection(result.rowIndex, ncmRes.ncm)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div>
                            <code className="font-bold text-gray-900">{ncmRes.ncm}</code>
                            <p className="text-sm text-gray-600">{ncmRes.descricao}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-md">
                      {result.query.includes('Valor Nulo/Inválido') ?
                        'Valor da coluna de origem inválido/vazio. Nenhuma busca realizada.' :
                        'Nenhum NCM encontrado para este item.'}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-4">
              <button onClick={handleGenerateFile} disabled={!isReviewComplete || isGenerating} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400">
                {isGenerating ? 'Gerando Arquivo...' : 'Confirmar e Gerar Planilha'}
              </button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">
                Começar de Novo
              </button>
            </div>
          </div>
        )}

        {/* Etapa 6: Concluído */}
        {step === 'done' && (
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Processo Concluído!</h2>
            <p className="text-gray-700 mb-6">Sua planilha foi processada e o download do novo arquivo foi iniciado.</p>
            <button onClick={resetState} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
              Processar Outro Arquivo
            </button>
          </div>
        )}

      </div>
    </div>
  );
};