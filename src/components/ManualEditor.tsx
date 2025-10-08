"use client";

import React, { useState, useCallback, useMemo } from "react";
import type { FC } from "react";
import {
  createInitialManualData,
  ManualData,
  SectionContent,
  Tab,
  ManualDataSchema,
} from "@/lib/manual-schema";

// --- Definição de Tipos para os Props ---

interface SectionRendererProps {
  section: SectionContent;
  isEditMode: boolean;
  onRemove: (id: string) => void;
}

// --- Sub-componentes de Renderização ---

const renderers: { [key in SectionContent["type"]]: FC<SectionRendererProps> } =
  {
    paragraph: ({ section }: SectionRendererProps) => {
      if (section.type !== "paragraph") return null;
      return (
        <div className="mt-2">
          <p className="whitespace-pre-wrap text-gray-700">{section.data}</p>
        </div>
      );
    },
    table: ({ section }: SectionRendererProps) => {
      if (section.type !== "table") return null;
      return (
        <div className="mt-4 overflow-x-auto">
          <h4 className="font-semibold text-gray-700">{section.title}</h4>
          <table className="min-w-full divide-y divide-gray-200 mt-2 border">
            <thead className="bg-gray-50">
              <tr>
                {section.headers.map((header: string, index: number) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {section.rows.map((row: string[], rowIndex: number) => (
                <tr key={rowIndex}>
                  {row.map((cell: string, cellIndex: number) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-600"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
    list: ({ section }: SectionRendererProps) => {
      if (section.type !== "list") return null;
      return (
        <div className="mt-3">
          {section.title && (
            <h4 className="font-semibold text-gray-700">{section.title}</h4>
          )}
          <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-700">
            {section.items.map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      );
    },
    alert: ({ section }: SectionRendererProps) => {
      if (section.type !== "alert") return null;
      const colors = {
        info: "bg-blue-50 border-blue-300 text-blue-800",
        warning: "bg-yellow-50 border-yellow-300 text-yellow-800",
        danger: "bg-red-50 border-red-300 text-red-800",
      };
      return (
        <div
          className={`mt-4 p-4 border-l-4 rounded-r-lg ${
            colors[section.level as keyof typeof colors]
          }`}
        >
          <strong className="font-bold block">{section.title}</strong>
          <p className="mt-1">{section.data}</p>
        </div>
      );
    },
    // Adição necessária para evitar erros de execução
    collapsible: ({ section, isEditMode, onRemove }: SectionRendererProps) => {
      if (section.type !== "collapsible") return null;
      return (
        <details
          className="group border border-gray-200 rounded-lg p-4 mt-4 bg-gray-50"
          open
        >
          <summary className="font-semibold text-lg text-gray-800 cursor-pointer flex justify-between items-center list-none">
            {section.title}
            <svg
              className="w-5 h-5 ml-4 text-cyan-600 transform group-open:rotate-180 transition-transform duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <div className="mt-4 pl-4 border-l-2 border-cyan-200">
            {section.content.map((contentSection: SectionContent) => (
              <SectionRenderer
                key={contentSection.id}
                section={contentSection}
                isEditMode={isEditMode}
                onRemove={onRemove}
              />
            ))}
          </div>
        </details>
      );
    },
  };

const SectionRenderer: FC<SectionRendererProps> = ({
  section,
  isEditMode,
  onRemove,
}) => {
  const Renderer = renderers[section.type];

  return (
    <div className="border-b border-gray-200 py-4 relative group">
      {isEditMode && (
        <button
          onClick={() => onRemove(section.id)}
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs"
          title="Remover Bloco"
          aria-label="Remover Bloco"
        >
          &times; Remover
        </button>
      )}
      {Renderer ? (
        <Renderer
          section={section}
          isEditMode={isEditMode}
          onRemove={onRemove}
        />
      ) : (
        <p>Bloco de tipo desconhecido: {section.type}</p>
      )}
    </div>
  );
};

// --- Componente Principal ---
export const ManualEditor = () => {
  const [manualData, setManualData] = useState<ManualData>(
    createInitialManualData()
  );
  const [activeTabId, setActiveTabId] = useState<string>("");
  // O modo de edição está fixo por enquanto. Se for se tornar dinâmico,
  // o setter (setIsEditMode) precisará ser usado.
  const isEditMode = true;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [sanitize, setSanitize] = useState(false);
  // const [sanitizedText, setSanitizedText] = useState("");
  const [generationPrompt, setGenerationPrompt] = useState(
    "Estruture este documento num manual de manutenção. Crie abas para 'Propósito', 'Ferramentas', 'Desmontagem' e 'Solução de Problemas'."
  );
  const [targetLanguage, setTargetLanguage] = useState("Português");

  const handleSanitize = async (text: string): Promise<string> => {
    try {
      const res = await fetch("/api/sanitize-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      return data.sanitizedText || text;
    } catch (err) {
      console.error("Erro ao sanitizar:", err);
      return text;
    }
  };

  // Função recursiva para remover seções aninhadas
  const removeSectionRecursively = useCallback(
  (sections: SectionContent[], sectionId: string): SectionContent[] => {
    return sections
      .filter((s) => s.id !== sectionId)
      .map((section) => {
        if (section.type === "collapsible" && section.content) {
          return {
            ...section,
            content: section.content.filter((s) => s.id !== sectionId),
          };
        }
        return section;
      });
  },
  []
);

  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      setManualData((prev) => {
        const newTabs = prev.tabs.map((tab: Tab) => {
          if (tab.id !== activeTabId) return tab;
          return {
            ...tab,
            content: removeSectionRecursively(tab.content, sectionId),
          };
        });
        return { ...prev, tabs: newTabs };
      });
    },
    [activeTabId, removeSectionRecursively]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setUploadedFiles(Array.from(event.target.files));
    }
  };

  const generateManual = async () => {
    if (!documentContent && uploadedFiles.length === 0) {
      setError("Forneça um conteúdo de texto ou envie arquivos para a IA analisar.");
      return;
    }

    setIsLoading(true);
    setError(null);

    let textToSend = documentContent;

    if (sanitize && documentContent) {
      textToSend = await handleSanitize(documentContent);
    }

    const formData = new FormData();
    formData.append("prompt", generationPrompt);
    formData.append("targetLanguage", targetLanguage);
    formData.append("documentContent", textToSend);
    uploadedFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/generate-manual", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || `Erro na API: ${res.status}`);
      }

      const rawResponse = await res.json();
      console.log("Resposta Bruta da IA:", JSON.stringify(rawResponse, null, 2));

      const result = ManualDataSchema.safeParse(rawResponse);

      if (!result.success) {
        console.error("Erro de Validação Zod:", result.error.issues);
        setError("A IA retornou dados em um formato inesperado. Verifique a consola para ver a resposta bruta.");
        return;
      }

      setManualData(result.data);
      if (result.data.tabs.length > 0) {
        setActiveTabId(result.data.tabs[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeTabData = useMemo(() => {
    return manualData.tabs.find((tab: Tab) => tab.id === activeTabId);
  }, [manualData, activeTabId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8 font-sans antialiased">
      <div className="w-full max-w-6xl">
        <header className="bg-white shadow-lg rounded-xl p-6 mb-6 border-l-4 border-cyan-500">
          <h1 className="text-2xl font-extrabold text-cyan-700">
            Gerador de Manuais com IA
          </h1>
          <p className="text-gray-600 mt-2">
            Esta ferramenta estrutura documentação técnica em manuais
            interativos. Para começar, siga os passos na área de geração abaixo.
          </p>
          <div className="mt-4 bg-gray-100 border border-gray-300 text-gray-800 p-3 rounded-lg text-sm">
            <strong className="block mb-1">
              Garantia de Isolamento de Dados:
            </strong>
            A IA utilizará <strong>apenas</strong> o texto e os arquivos que
            você fornecer nesta tela. Nenhuma informação externa ou conhecimento
            da web será consultado para gerar seu manual.{" "}
            <strong>Seus dados não são usados para treinamento.</strong>
          </div>
        </header>

        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Painel de Geração de Conteúdo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Idioma
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option>Português</option>
                <option>Inglês</option>
                <option>Espanhol</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instrução para a IA (Prompt)
              </label>
              <input
                type="text"
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center md:col-span-3">
              <input
                id="sanitize-checkbox"
                type="checkbox"
                checked={sanitize}
                onChange={(e) => setSanitize(e.target.checked)}
                className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500 cursor-pointer"
              />
              <label htmlFor="sanitize-checkbox" className="ml-2 block text-sm text-gray-800 cursor-pointer">
                Sanitizar documento antes de enviar à IA externa
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conteúdo em Texto (Opcional)
              </label>
              <textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                rows={10}
                placeholder="Cole aqui o texto fonte..."
                className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload de Arquivos (DOCX, PDF, etc.)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-cyan-600 hover:text-cyan-500 focus-within:outline-none"
                    >
                      <span>Selecione os arquivos</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    DOCX, PDF, TXT até 10MB
                  </p>
                </div>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-3 text-sm">
                  <h4 className="font-semibold">Arquivos selecionados:</h4>
                  <ul className="list-disc ml-5 text-gray-600">
                    {uploadedFiles.map((f: File) => (
                      <li key={f.name}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            onClick={generateManual}
            disabled={isLoading}
            className="mt-6 w-full bg-cyan-600 text-white py-3 rounded-lg font-bold hover:bg-cyan-700 transition disabled:bg-gray-400"
          >
            {isLoading ? "Gerando Conteúdo..." : "Gerar Manual"}
          </button>
        </div>

        {manualData.tabs.length > 0 && (
          <div className="bg-white shadow-lg rounded-xl p-6 mb-20">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-800">
                {manualData.title}
              </h1>
              <div className="text-right text-sm text-gray-500">
                <div>Modelo: {manualData.model}</div>
                {manualData.revision && (
                  <div>
                    Revisão: {manualData.revision} | Data: {manualData.date}
                  </div>
                )}
              </div>
            </div>
            <nav className="flex space-x-1 border-b border-gray-200">
              {manualData.tabs.map((tab: Tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${
                    activeTabId === tab.id
                      ? "bg-white text-cyan-700 border-b-2 border-cyan-500"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </nav>
            <div className="mt-4 min-h-[400px]">
              {activeTabData?.content.map((section: SectionContent) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  isEditMode={isEditMode}
                  onRemove={handleRemoveSection}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
