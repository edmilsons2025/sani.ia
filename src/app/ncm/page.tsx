// NCM - Nomenclatura Comum do Mercosul

'use client';

import React, { useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { NcmService, NcmResultFromApi } from "@/services/NcmService";
import { useDebugLog } from "@/hooks/useDebugLog";
import { ProductClassifier } from "./components/ProductClassifier";

// --- Tipos de Dados ---

/**
 * Define os passos possíveis no fluxo do processador de planilhas.
 */
type Step =
  | "upload"
  | "sheet_select"
  | "header_line"
  | "mapping"
  | "review"
  | "done";

/**
 * Tipo para uma linha da planilha: um objeto com chaves string e valores de tipo desconhecido.
 * Usar 'unknown' é mais seguro que 'any' e satisfaz as regras de linting.
 */
type SheetRow = Record<string, unknown>;

/**
 * Representa o resultado do processamento para uma única linha da planilha.
 */
interface ProcessingResult {
  rowIndex: number;
  query: string;
  originalRow: SheetRow;
  ncmResults: NcmResultFromApi[]; // Assumindo que NcmResultFromApi tem { ncm: string, descricao: string }
}

// --- ALTERAÇÃO ---
/**
 * Define a estrutura da seleção final do usuário, agora incluindo a descrição.
 */
interface UserSelection {
  ncm: string;
  descricao: string;
}
// -----------------

/**
 * Página principal para o processamento de NCMs em lote a partir de planilhas.
 */
export default function NcmProcessorPage() {
  const { log, warn, error: logError } = useDebugLog("NcmProcessorPage");

  // --- Estados de Dados da Planilha ---
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [rawSheetData, setRawSheetData] = useState<unknown[][]>([]);
  const [headerLineIndex, setHeaderLineIndex] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [sourceColumn, setSourceColumn] = useState<string>("");
  const [destinationColumn, setDestinationColumn] = useState<string>("");

  // --- Estados de UI e Fluxo ---
  const [step, setStep] = useState<Step>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Estados dos Resultados e Seleções do Usuário ---
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  
  const [userSelections, setUserSelections] = useState<Record<number, UserSelection>>({});
  // -----------------


  /**
   * Reseta completamente o estado do componente para permitir um novo upload.
   */
  const resetState = useCallback(() => {
    log("Estado do componente resetado.");
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheetName("");
    setRawSheetData([]);
    setHeaderLineIndex(null);
    setHeaders([]);
    setSheetData([]);
    setSourceColumn("");
    setDestinationColumn("");
    setProcessingResults([]);
    setUserSelections({});
    setStep("upload");
    setError(null);
  }, [log]);

  /**
   * Processa a aba selecionada pelo usuário, extraindo os dados brutos.
   */
  const handleSheetSelection = useCallback((currentWorkbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = currentWorkbook.Sheets[sheetName];
    if (!worksheet) {
      const errorMsg = `Aba "${sheetName}" não encontrada no workbook.`;
      logError(errorMsg);
      setError(errorMsg);
      setStep("upload");
      return;
    }

    // --- OTIMIZAÇÃO ---
    // Obter o range da planilha para evitar a leitura de milhões de linhas vazias
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const maxRows = 100000; // Limite de 100.000 linhas
      if (range.e.r > maxRows) {
        warn(`A planilha tem mais de ${maxRows} linhas. A leitura será limitada a ${maxRows} para evitar problemas de performance.`);
        range.e.r = maxRows;
        worksheet['!ref'] = XLSX.utils.encode_range(range);
      }
    }
    // --------------------

    const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 , blankrows: false });
    if (rawData.length < 1) {
      setError("A aba selecionada está vazia ou em um formato inválido.");
      setStep("upload");
      return;
    }
    setRawSheetData(rawData);
    setHeaderLineIndex(1);
    setStep("header_line");
    setError(null);
  }, [logError, warn]);

  /**
   * Lida com a seleção de um arquivo, lê o conteúdo e avança para a próxima etapa.
   */
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    setFile(selectedFile);
    try {
      const data = await selectedFile.arrayBuffer();
      const newWorkbook = XLSX.read(data, { type: "buffer" });
      const newSheetNames = newWorkbook.SheetNames;
      if (newSheetNames.length === 0) throw new Error("O arquivo não contém abas.");
      setWorkbook(newWorkbook);
      setSheetNames(newSheetNames);
      setSelectedSheetName(newSheetNames[0]);
      if (newSheetNames.length > 1) {
        setStep("sheet_select");
      } else {
        handleSheetSelection(newWorkbook, newSheetNames[0]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
      logError("Erro ao ler o arquivo:", err);
      setError(`Erro ao ler o arquivo: ${message}`);
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  }, [logError, handleSheetSelection]);

  /**
   * Extrai os cabeçalhos e os dados da planilha com base na linha selecionada.
   */
  const handleHeaderLineSelection = useCallback(() => {
    if (headerLineIndex === null || headerLineIndex < 1 || headerLineIndex > rawSheetData.length) return;
    const headerArrayIndex = headerLineIndex - 1;
    const sheetHeaders: string[] = (rawSheetData[headerArrayIndex] as unknown[]).map(h => String(h ?? "").trim()).filter(Boolean);
    if (sheetHeaders.length === 0) return;
    const dataRows = rawSheetData.slice(headerArrayIndex + 1).filter(row => row.some(cell => cell != null && String(cell).trim() !== ""));
    const processedData: SheetRow[] = dataRows.map(row =>
      sheetHeaders.reduce((obj, header, index) => {
        obj[header] = row[index];
        return obj;
      }, {} as SheetRow)
    );
    setHeaders(sheetHeaders);
    setSheetData(processedData);
    const suggestedSource = sheetHeaders.find(h => /produto|descri(c|ç)(a|ã)o/i.test(h)) || sheetHeaders[0] || "";
    const suggestedDest = sheetHeaders.find(h => /ncm/i.test(h));
    setSourceColumn(suggestedSource);
    setDestinationColumn(suggestedDest && suggestedDest !== suggestedSource ? suggestedDest : "");
    setStep("mapping");
  }, [headerLineIndex, rawSheetData]);

  /**
   * Inicia o processo de busca em lote.
   */
  const handleStartProcessing = useCallback(async () => {
    if (!sourceColumn || !destinationColumn || sourceColumn === destinationColumn) return;
    setIsProcessing(true);
    setError(null);
    const ncmService = NcmService.getInstance();
    const results: ProcessingResult[] = [];
    let criticalApiError = false;
    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      const query = String(row[sourceColumn] ?? "").trim();
      if (query.length < 3) {
        //results.push({ rowIndex: i, query: query || "Valor Nulo/Inválido", originalRow: row, ncmResults: [] });
        continue;
      }
      try {
        const ncmResults = await ncmService.search(query);
        results.push({ rowIndex: i, query, originalRow: row, ncmResults });
      } catch (err) {
        if (i < 5) {
          criticalApiError = true;
          setError(`Falha crítica na conexão com a API NCM. Verifique se o serviço backend está no ar.`);
          break;
        }
        results.push({ rowIndex: i, query, originalRow: row, ncmResults: [] });
      }
    }
    setIsProcessing(false);
    if (criticalApiError) return;
    setProcessingResults(results);
    setStep("review");
  }, [sheetData, sourceColumn, destinationColumn]);

  
  // --- ALTERAÇÃO ---
  /**
   * Callback para registrar a seleção final do usuário.
   * Agora, ele busca a descrição correspondente antes de salvar no estado.
   */
  const handleNcmSelection = (rowIndex: number, ncmCode: string) => {
    // A assinatura do prop (string) é mantida para não quebrar o ProductClassifier.
    // Vamos encontrar o objeto NCM completo nos resultados do processamento.
    const resultItem = processingResults.find(r => r.rowIndex === rowIndex);
    if (!resultItem) {
      warn(`(handleNcmSelection) Não foi possível encontrar o item de processamento para a linha ${rowIndex}.`);
      return;
    }

    const selectedApiResult = resultItem.ncmResults.find(ncm => ncm.ncm === ncmCode);

    if (selectedApiResult) {
      // Encontramos o NCM e sua descrição nos resultados da API.
      setUserSelections(prev => ({
        ...prev,
        [rowIndex]: { ncm: ncmCode, descricao: selectedApiResult.descricao }
      }));
    } else {
      // Não encontrado. Isso pode ser uma entrada manual do ProductClassifier.
      // Como não temos a descrição, salvaremos um fallback.
      warn(`(handleNcmSelection) NCM "${ncmCode}" não encontrado nos resultados da API para a linha ${rowIndex}. Pode ser uma entrada manual.`);
      setUserSelections(prev => ({
        ...prev,
        [rowIndex]: { ncm: ncmCode, descricao: "Descrição não encontrada (manual)" }
      }));
    }
  };
  // -----------------


  /**
   * Callback para submeter uma sugestão vinda de uma busca manual.
   */
  const handleSuggestionSubmission = useCallback(async (originalQuery: string, ncm: NcmResultFromApi) => {
    log(`Enviando sugestão para "${originalQuery}" -> ${ncm.ncm}`);
    try {
      const ncmService = NcmService.getInstance();
      await ncmService.submitSuggestion(originalQuery, ncm);
      log("Sugestão enviada com sucesso!");
    } catch (err) {
      logError("Falha ao enviar sugestão:", err);
    }
  }, [log, logError]);

  /**
   * Verifica se todos os itens que necessitam de revisão já foram selecionados.
   */
  const isReviewComplete = useMemo(() => {
    if (processingResults.length === 0) return false;
    // A verificação `userSelections[result.rowIndex]` continua válida (checa se a chave existe)
    return processingResults.every(result => result.ncmResults.length === 0 || userSelections[result.rowIndex]);
  }, [processingResults, userSelections]);

  
  // --- ALTERAÇÃO ---
  /**
   * Gera e inicia o download do arquivo XLSX final.
   * Agora inclui a nova coluna "Descrição do NCM" e força a ordem das colunas.
   */
  const handleGenerateFile = useCallback(() => {
    setIsGenerating(true);
    try {
      // 1. Definir a ordem final dos cabeçalhos
      const newHeaders: string[] = [];
      headers.forEach(header => {
        newHeaders.push(header); // Adiciona o cabeçalho original
        if (header === destinationColumn) {
          // Se for a coluna NCM, adiciona a nova coluna de descrição logo depois
          newHeaders.push("Descrição do NCM");
        }
      });

      // 2. Mapear os dados para a estrutura final
      const finalData = sheetData.map((row, index) => {
        const result = processingResults.find(r => r.originalRow === row);
        const selection = result ? userSelections[result.rowIndex] : undefined;

        // Começa com uma cópia da linha original
        const newRow: SheetRow = { ...row };

        if (selection) {
          // Se há uma seleção, preenche as colunas
          newRow[destinationColumn] = selection.ncm;
          newRow["Descrição do NCM"] = selection.descricao;
        } else {
          // Se não há seleção, garante que a coluna de descrição exista (vazia)
          // para manter a consistência da planilha.
          newRow["Descrição do NCM"] = row["Descrição do NCM"] ?? "";
        }
        return newRow;
      });

      // 3. Gerar a planilha com a ordem de cabeçalho explícita
      const newWorksheet = XLSX.utils.json_to_sheet(finalData, { header: newHeaders });
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "NCMs Processados");
      const originalFileName = file?.name.replace(/\.(xlsx|xlsm)$/, "") || "planilha";
      XLSX.writeFile(newWorkbook, `${originalFileName}_com_ncm.xlsx`);
      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
      setError(`Erro ao gerar o arquivo final: ${message}`);
    } finally {
      setIsGenerating(false);
    }
    // Adicionado 'headers' à lista de dependências
  }, [sheetData, processingResults, userSelections, destinationColumn, headers, file?.name]);
  // -----------------


  return (
    <div className="font-sans w-full">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200/80">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Processador de NCM em Lote</h1>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-900 px-4 py-3 rounded-md my-4" role="alert">
            <strong className="font-bold">Erro: </strong><span className="block sm:inline font-medium">{error}</span>
          </div>
        )}
        {step === "upload" && (
          <div>
            <p className="text-gray-600 mb-6">Faça o upload de uma planilha (.xlsx, .xlsm) para buscar e preencher os NCMs automaticamente.</p>
            <input type="file" accept=".xlsx, .xlsm" onChange={handleFileChange} disabled={isLoading} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer" />
            {isLoading && <p className="mt-4 text-violet-700 animate-pulse">Lendo a planilha...</p>}
          </div>
        )}
        {step === "sheet_select" && sheetNames.length > 1 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Selecione a Aba de Dados</h2>
            <p className="text-gray-600 mb-6">O arquivo <strong>{file?.name}</strong> contém {sheetNames.length} abas. Por favor, escolha qual aba contém os dados de produtos.</p>
            <select value={selectedSheetName} onChange={(e) => setSelectedSheetName(e.target.value)} className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md bg-white text-lg text-gray-900">
              {sheetNames.map((name) => (<option key={name} value={name}>{name}</option>))}
            </select>
            <div className="mt-6 flex gap-4">
              <button onClick={() => workbook && handleSheetSelection(workbook, selectedSheetName)} disabled={!selectedSheetName || !workbook} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400">Avançar para Seleção do Cabeçalho</button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        )}
        {step === "header_line" && rawSheetData.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Onde estão seus cabeçalhos?</h2>
            <p className="text-gray-600 mb-6">A aba <strong>{selectedSheetName}</strong> tem {rawSheetData.length} linhas. Insira o número da linha que contém o nome das colunas (Base 1).</p>
            <input type="number" min="1" max={rawSheetData.length} placeholder="Ex: 1" value={headerLineIndex ?? ""} onChange={(e) => setHeaderLineIndex(parseInt(e.target.value) || null)} className="w-32 p-2 border border-gray-300 rounded-md bg-white text-center text-gray-600 text-lg font-mono" />
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização da Linha {headerLineIndex || "1"}:</p>
              <div className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                <code className="whitespace-nowrap text-xs text-gray-700">{(rawSheetData[(headerLineIndex ?? 1) - 1] as string[])?.join(" | ") || "Nenhuma linha para pré-visualizar."}</code>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button onClick={handleHeaderLineSelection} disabled={headerLineIndex === null || headerLineIndex < 1 || headerLineIndex > rawSheetData.length} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400">Confirmar Cabeçalhos</button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        )}
        {step === "mapping" && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Mapeie suas Colunas</h2>
            <p className="text-gray-600 mb-4">Planilha <strong>{selectedSheetName}</strong> carregada. Selecione as colunas de trabalho.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="source-col" className="block text-sm font-medium text-gray-700 mb-1">Coluna com a descrição do produto (Origem)</label>
                <select id="source-col" value={sourceColumn} onChange={(e) => setSourceColumn(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900">{headers.map((h) => (<option key={h} value={h}>{h}</option>))}</select>
              </div>
              <div>
                <label htmlFor="dest-col" className="block text-sm font-medium text-gray-700 mb-1">Coluna para preencher o NCM (Destino)</label>
                <select id="dest-col" value={destinationColumn} onChange={(e) => setDestinationColumn(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900">
                  <option value="">-- Selecione uma coluna --</option>
                  {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button onClick={handleStartProcessing} disabled={isProcessing || !sourceColumn || !destinationColumn} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400">{isProcessing ? "Processando..." : "Iniciar Busca de NCMs"}</button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        )}
        {step === "review" && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Revise e Selecione os NCMs</h2>
            <p className="text-gray-600 mb-6">Selecione o NCM correto para cada produto.</p>
            
            <ProductClassifier
              processingResults={processingResults}
              userSelections={
                Object.entries(userSelections).reduce((acc, [key, value]) => {
                  acc[Number(key)] = value.ncm;
                  return acc;
                }, {} as Record<number, string>)
                // -----------------
              }
              onNcmSelected={handleNcmSelection}
              onSuggestionSubmitted={handleSuggestionSubmission}
            />

            <div className="mt-6 flex gap-4">
              <button onClick={handleGenerateFile} disabled={!isReviewComplete || isGenerating} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400">{isGenerating ? "Gerando..." : "Confirmar e Gerar Planilha"}</button>
              <button onClick={resetState} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">Começar de Novo</button>
            </div>
          </div>
        )}
        {step === "done" && (
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Processo Concluído!</h2>
            <p className="text-gray-700 mb-6">Sua planilha foi processada e o download do novo arquivo foi iniciado.</p>
            <button onClick={resetState} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">Processar Outro Arquivo</button>
          </div>
        )}
      </div>
    </div>
  );
}