"use client";

import React, { useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { NcmService, NcmResultFromApi } from "@/services/NcmService";
import { useDebugLog } from "@/hooks/useDebugLog";

// Importa o novo componente especialista em classificação de item único.
// Verifique se o caminho corresponde à sua estrutura de pastas.
import { ClassificationItem } from "@/app/ncm/components/ClassificationItem";
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
 * Representa o resultado do processamento para uma única linha da planilha,
 * contendo a query original, os dados da linha e os resultados da API.
 */
interface ProcessingResult {
  rowIndex: number;
  query: string;
  originalRow: any;
  ncmResults: NcmResultFromApi[];
}

// --- Componente Principal da Página ---

/**
 * Página principal para o processamento de NCMs em lote a partir de planilhas.
 * Este componente guia o usuário através de um fluxo de múltiplas etapas:
 * 1. Upload de uma planilha (.xlsx, .xlsm).
 * 2. Seleção da aba e da linha de cabeçalho.
 * 3. Mapeamento das colunas de origem (descrição) e destino (NCM).
 * 4. Processamento em lote, buscando NCMs para cada linha.
 * 5. Uma etapa de revisão interativa onde o usuário pode confirmar ou buscar
 * manualmente o NCM para cada item.
 * 6. Geração e download da planilha final com os NCMs preenchidos.
 */
export default function NcmProcessorPage() {
  const { log, warn, error: logError } = useDebugLog("NcmProcessorPage");

  // --- Estados de Dados da Planilha ---
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [rawSheetData, setRawSheetData] = useState<any[][]>([]);
  const [headerLineIndex, setHeaderLineIndex] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [sourceColumn, setSourceColumn] = useState<string>("");
  const [destinationColumn, setDestinationColumn] = useState<string>("");

  // --- Estados de UI e Fluxo ---
  const [step, setStep] = useState<Step>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Estados dos Resultados e Seleções do Usuário ---
  const [processingResults, setProcessingResults] = useState<
    ProcessingResult[]
  >([]);
  const [userSelections, setUserSelections] = useState<Record<number, string>>(
    {}
  );

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
   * Lida com a seleção de um arquivo, lê o conteúdo como um workbook XLSX
   * e avança para a próxima etapa.
   * @param event O evento de mudança do input de arquivo.
   */
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      log(`Arquivo selecionado: ${selectedFile.name}`);
      setIsLoading(true);
      setError(null);
      setFile(selectedFile);
      setStep("upload");

      try {
        const data = await selectedFile.arrayBuffer();
        const newWorkbook = XLSX.read(data, { type: "buffer" });
        const newSheetNames = newWorkbook.SheetNames;

        if (newSheetNames.length === 0)
          throw new Error("O arquivo não contém abas (sheets).");

        setWorkbook(newWorkbook);
        setSheetNames(newSheetNames);
        setSelectedSheetName(newSheetNames[0]);

        if (newSheetNames.length > 1) {
          setStep("sheet_select");
        } else {
          handleSheetSelection(newWorkbook, newSheetNames[0]);
        }
      } catch (err: any) {
        logError("Erro ao ler o arquivo:", err);
        setError(`Erro ao ler o arquivo: ${err.message}`);
        setStep("upload");
      } finally {
        setIsLoading(false);
      }
    },
    [log, logError]
  );

  /**
   * Processa a aba selecionada pelo usuário, extraindo os dados brutos.
   * @param currentWorkbook O workbook XLSX carregado.
   * @param sheetName O nome da aba selecionada.
   */
  const handleSheetSelection = useCallback(
    (currentWorkbook: XLSX.WorkBook, sheetName: string) => {
      log(`Aba selecionada: "${sheetName}"`);
      const worksheet = currentWorkbook.Sheets[sheetName];
      if (!worksheet) {
        logError(`Aba "${sheetName}" não encontrada.`);
        setError(`Aba "${sheetName}" não encontrada.`);
        return;
      }

      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });
      if (rawData.length < 1) {
        setError("A aba selecionada está vazia.");
        return;
      }

      setRawSheetData(rawData);
      setHeaderLineIndex(1);
      setStep("header_line");
      setError(null);
    },
    [log, logError]
  );

  /**
   * Extrai os cabeçalhos e os dados da planilha com base na linha selecionada pelo usuário.
   */
  const handleHeaderLineSelection = useCallback(() => {
    if (
      headerLineIndex === null ||
      headerLineIndex < 1 ||
      headerLineIndex > rawSheetData.length
    ) {
      setError("Selecione uma linha válida para o cabeçalho.");
      return;
    }

    const headerArrayIndex = headerLineIndex - 1;
    const sheetHeaders = (rawSheetData[headerArrayIndex] as any[])
      .map((h) => String(h ?? "").trim())
      .filter(Boolean);

    if (sheetHeaders.length === 0) {
      setError("A linha selecionada não contém cabeçalhos válidos.");
      return;
    }

    const dataRows = rawSheetData
      .slice(headerArrayIndex + 1)
      .filter((row) =>
        row.some(
          (cell) =>
            cell !== null && cell !== undefined && String(cell).trim() !== ""
        )
      );

    const processedData = dataRows.map((row) =>
      sheetHeaders.reduce((obj, header, index) => {
        obj[header] = row[index];
        return obj;
      }, {} as any)
    );

    setHeaders(sheetHeaders);
    setSheetData(processedData);

    const suggestedSource =
      sheetHeaders.find((h) => /produto|descri(c|ç)(a|ã)o/i.test(h)) ||
      sheetHeaders[0];
    const suggestedDest = sheetHeaders.find((h) => /ncm/i.test(h));
    setSourceColumn(suggestedSource);
    setDestinationColumn(
      suggestedDest && suggestedDest !== suggestedSource ? suggestedDest : ""
    );

    setStep("mapping");
    setError(null);
  }, [headerLineIndex, rawSheetData, log]);

  /**
   * Inicia o processo de busca em lote, iterando sobre os dados da planilha
   * e chamando o serviço de NCM para cada linha.
   */
  const handleStartProcessing = useCallback(async () => {
    if (
      !sourceColumn ||
      !destinationColumn ||
      sourceColumn === destinationColumn
    ) {
      setError("Selecione colunas de origem e destino diferentes e válidas.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    const ncmService = NcmService.getInstance();
    const results: ProcessingResult[] = [];
    let criticalApiError = false;

    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      const query = String(row[sourceColumn] ?? "").trim();

      if (query.length < 3) {
        results.push({
          rowIndex: i,
          query: query || "Valor Nulo/Inválido",
          originalRow: row,
          ncmResults: [],
        });
        continue;
      }

      try {
        const ncmResults = await ncmService.search(query);
        results.push({ rowIndex: i, query, originalRow: row, ncmResults });
      } catch (err: any) {
        logError(`Falha ao buscar NCM para "${query}".`, err);
        results.push({ rowIndex: i, query, originalRow: row, ncmResults: [] });
        if (i < 5) {
          criticalApiError = true;
          setError(
            `Falha crítica na conexão com a API NCM. Verifique se o serviço está no ar.`
          );
          break;
        }
      }
    }

    setIsProcessing(false);
    if (criticalApiError) return;

    setProcessingResults(results);
    setStep("review");
  }, [sheetData, sourceColumn, destinationColumn, log, warn, logError]);

  /**
   * Callback passado para cada ClassificationItem para registrar a seleção final do usuário.
   * @param rowIndex O índice da linha na planilha.
   * @param ncm O código NCM selecionado.
   */
  const handleNcmSelection = (rowIndex: number, ncm: string) => {
    setUserSelections((prev) => ({ ...prev, [rowIndex]: ncm }));
  };

  /**
   * Callback para lidar com a submissão de uma sugestão vinda de uma busca manual.
   * @param originalQuery O texto original do produto.
   * @param ncm O objeto NCMResultFromApi selecionado manualmente.
   */
  const handleSuggestionSubmission = useCallback(
    async (originalQuery: string, ncm: NcmResultFromApi) => {
      log(`Enviando sugestão para "${originalQuery}" -> ${ncm.ncm}`);
      try {
        const ncmService = NcmService.getInstance();
        await ncmService.submitSuggestion(originalQuery, ncm);
        log("Sugestão enviada com sucesso!");
      } catch (err) {
        logError("Falha ao enviar sugestão:", err);
      }
    },
    [log, logError]
  );

  /**
   * Verifica se todos os itens que necessitam de revisão já foram selecionados.
   */
  const isReviewComplete = useMemo(() => {
    if (processingResults.length === 0) return false;
    return processingResults.every(
      (result) =>
        result.ncmResults.length === 0 || userSelections[result.rowIndex]
    );
  }, [processingResults, userSelections]);

  /**
   * Gera e inicia o download do arquivo XLSX final com os NCMs preenchidos.
   */
  const handleGenerateFile = () => {
    setIsGenerating(true);
    try {
      const finalData = sheetData.map((row, index) => {
        const originalResult = processingResults.find(
          (p) => p.rowIndex === index
        );
        if (originalResult) {
          const selectedNcm = userSelections[originalResult.rowIndex];
          if (selectedNcm) {
            return {
              ...originalResult.originalRow,
              [destinationColumn]: selectedNcm,
            };
          }
          return originalResult.originalRow;
        }
        return row;
      });

      const newWorksheet = XLSX.utils.json_to_sheet(finalData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        newWorkbook,
        newWorksheet,
        "NCMs Processados"
      );

      const originalFileName =
        file?.name.replace(/\.[^/.]+$/, "") || "planilha";
      XLSX.writeFile(newWorkbook, `${originalFileName}_com_ncm.xlsx`);

      setStep("done");
    } catch (err: any) {
      setError(`Erro ao gerar o arquivo final: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="font-sans w-full">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200/80">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Processador de NCM em Lote
        </h1>

        {error && (
          <div
            className="bg-red-50 border-l-4 border-red-500 text-red-900 px-4 py-3 rounded-md my-4"
            role="alert"
          >
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline font-medium">{error}</span>
          </div>
        )}

        {step === "upload" && (
          <div>
            <p className="text-gray-600 mb-6">
              Faça o upload de uma planilha (.xlsx, .xlsm) para buscar e
              preencher os NCMs automaticamente.
            </p>
            <input
              type="file"
              accept=".xlsx, .xlsm"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
            />
            {isLoading && (
              <p className="mt-4 text-violet-700 animate-pulse">
                Lendo a planilha...
              </p>
            )}
          </div>
        )}

        {step === "sheet_select" && sheetNames.length > 1 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Selecione a Aba de Dados
            </h2>
            <p className="text-gray-600 mb-6">
              O arquivo <strong>{file?.name}</strong> contém {sheetNames.length}{" "}
              abas. Por favor, escolha qual aba contém os dados de produtos.
            </p>
            <select
              value={selectedSheetName}
              onChange={(e) => setSelectedSheetName(e.target.value)}
              className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md bg-white text-lg text-gray-900"
            >
              {sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div className="mt-6 flex gap-4">
              <button
                onClick={() =>
                  workbook && handleSheetSelection(workbook, selectedSheetName)
                }
                disabled={!selectedSheetName || !workbook}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
              >
                Avançar para Seleção do Cabeçalho
              </button>
              <button
                onClick={resetState}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === "header_line" && rawSheetData.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Onde estão seus cabeçalhos?
            </h2>
            <p className="text-gray-600 mb-6">
              A aba <strong>{selectedSheetName}</strong> tem{" "}
              {rawSheetData.length} linhas. Insira o número da linha que contém
              o nome das colunas (Base 1).
            </p>
            <input
              type="number"
              min="1"
              max={rawSheetData.length}
              placeholder="Ex: 1"
              value={headerLineIndex ?? ""}
              onChange={(e) =>
                setHeaderLineIndex(parseInt(e.target.value) || null)
              }
              className="w-32 p-2 border border-gray-300 rounded-md bg-white text-center text-gray-600 text-lg font-mono"
            />
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Pré-visualização da Linha {headerLineIndex || "1"} (Valores
                separados por |):
              </p>
              <div className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                <code className="whitespace-nowrap text-xs text-gray-700">
                  {rawSheetData[(headerLineIndex ?? 1) - 1]?.join(" | ") ||
                    "Nenhuma linha para pré-visualizar."}
                </code>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleHeaderLineSelection}
                disabled={
                  headerLineIndex === null ||
                  headerLineIndex < 1 ||
                  headerLineIndex > rawSheetData.length
                }
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
              >
                Confirmar Cabeçalhos
              </button>
              <button
                onClick={resetState}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Mapeie suas Colunas
            </h2>
            <p className="text-gray-600 mb-4">
              Planilha <strong>{selectedSheetName}</strong> carregada. Selecione
              as colunas de trabalho.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="source-col"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Coluna com a descrição do produto (Origem)
                </label>
                <select
                  id="source-col"
                  value={sourceColumn}
                  onChange={(e) => setSourceColumn(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="dest-col"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Coluna para preencher o NCM (Destino)
                </label>
                <select
                  id="dest-col"
                  value={destinationColumn}
                  onChange={(e) => setDestinationColumn(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  <option value="">-- Selecione uma coluna --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleStartProcessing}
                disabled={isProcessing || !sourceColumn || !destinationColumn}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isProcessing ? "Processando..." : "Iniciar Busca de NCMs"}
              </button>
              <button
                onClick={resetState}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Revise e Selecione os NCMs
            </h2>
            <p className="text-gray-600 mb-6">
              Selecione o NCM correto para cada produto. Itens que precisam de
              atenção ficarão destacados.
            </p>

            <ProductClassifier
              processingResults={processingResults}
              userSelections={userSelections}
              onNcmSelected={handleNcmSelection}
              onSuggestionSubmitted={handleSuggestionSubmission}
            />

            <div className="mt-6 flex gap-4">
              <button
                onClick={handleGenerateFile}
                disabled={!isReviewComplete || isGenerating}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400"
              >
                {isGenerating
                  ? "Gerando Arquivo..."
                  : "Confirmar e Gerar Planilha"}
              </button>
              <button
                onClick={resetState}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300"
              >
                Começar de Novo
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Processo Concluído!
            </h2>
            <p className="text-gray-700 mb-6">
              Sua planilha foi processada e o download do novo arquivo foi
              iniciado.
            </p>
            <button
              onClick={resetState}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700"
            >
              Processar Outro Arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
