import { NextResponse } from 'next/server';
import { VertexAI, FunctionCallingMode, FunctionDeclarationSchemaType } from '@google-cloud/vertexai';
import mammoth from 'mammoth'; // Importamos a biblioteca para ler .docx

async function initializeVertexAI(targetLanguage: string) {
  const vertex_ai = new VertexAI({
    project: 'sopia-473720',
    location: 'us-east1',
  });

  const parametersSchema = {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
        title: { type: FunctionDeclarationSchemaType.STRING, description: 'O título principal do manual de manutenção.' },
        model: { type: FunctionDeclarationSchemaType.STRING, description: 'O modelo do equipamento.' },
        revision: { type: FunctionDeclarationSchemaType.STRING, description: 'A versão de revisão do manual, ex: "V1.1".' },
        date: { type: FunctionDeclarationSchemaType.STRING, description: 'A data no formato YYYY-MM-DD.' },
        tabs: {
            type: FunctionDeclarationSchemaType.ARRAY,
            description: 'A lista de abas do manual.',
            items: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                    title: { type: FunctionDeclarationSchemaType.STRING, description: 'O título da aba (ex: "Desmontagem").' },
                    content: {
                        type: FunctionDeclarationSchemaType.ARRAY,
                        description: 'A lista de blocos de conteúdo. Use uma variedade de tipos de bloco para melhor organizar a informação.',
                        items: {
                            type: FunctionDeclarationSchemaType.OBJECT,
                            description: 'Um bloco de conteúdo. DEVE ter um campo "type".',
                            properties: {
                                type: { type: FunctionDeclarationSchemaType.STRING, description: 'Tipo do bloco: "paragraph", "table", "list", "alert", ou "collapsible".' },
                                title: { type: FunctionDeclarationSchemaType.STRING, description: 'Título para blocos "table", "list", "alert" ou "collapsible".' },
                                data: { type: FunctionDeclarationSchemaType.STRING, description: 'Texto para blocos "paragraph" ou "alert".' },
                                headers: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING }, description: 'Para blocos do tipo "table", uma lista com as strings do cabeçalho.' },
                                rows: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING } }, description: 'Para blocos do tipo "table", uma lista de listas, onde cada lista interna representa uma linha.' },
                                items: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING }, description: 'Itens para blocos do tipo "list".' },
                                level: { type: FunctionDeclarationSchemaType.STRING, description: 'Nível para "alert": "info", "warning", ou "danger".' },
                                content: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.OBJECT }, description: 'Para blocos do tipo "collapsible", uma lista de outros blocos aninhados.'}
                            }
                        }
                    }
                }
            }
        }
    },
    required: ['title', 'tabs']
  };

  const generativeModel = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash', 
    generationConfig: {
      responseMimeType: 'application/json',
    },
    systemInstruction: {
      role: 'system',
      parts: [{ text: `Você é um assistente de documentação. Sua única tarefa é usar a ferramenta 'format_maintenance_manual' para estruturar o texto do usuário.
      REGRAS OBRIGATÓRIAS:
      1.  **NÃO RESUMA NADA**: Transcreva e estruture todo o texto fornecido, sem omitir detalhes. A fidelidade ao conteúdo original é crucial.
      2.  **LÓGICA DE ANINHAMENTO**: Ao ler o texto, se encontrar um título de secção (como "4.2. Procedimentos de Desmontagem" ou "5-1. Causas para não ligar"), você DEVE criar um bloco do tipo 'collapsible' com esse título. Em seguida, todos os parágrafos seguintes que detalham esse tópico (como "4-2-1...", "5-1-1...") DEVEM ser colocados como blocos 'paragraph' DENTRO do campo 'content' desse bloco 'collapsible'. Continue a agrupar parágrafos dentro do mesmo 'collapsible' até encontrar o próximo título de secção.
      3.  **LÓGICA DE TABELAS**: Se encontrar um texto formatado como uma tabela (com cabeçalhos e linhas), você DEVE criar um bloco do tipo 'table'. A primeira linha do texto da tabela deve ser o seu array 'headers'. Cada linha seguinte deve ser um array de strings dentro do seu array 'rows'. NUNCA coloque o texto de uma tabela dentro de um campo 'data'.
      4.  **IDIOMA**: A resposta final DEVE ser inteiramente no idioma '${targetLanguage}'. Traduza todo o conteúdo do texto de origem, incluindo termos técnicos.
      A sua única resposta deve ser a chamada da função 'format_maintenance_manual'.` }]
    },
    tools: [{
      functionDeclarations: [{
        name: "format_maintenance_manual",
        description: "Formata o conteúdo extraído em um manual de manutenção estruturado.",
        parameters: parametersSchema,
      }]
    }],
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingMode.AUTO,
      }
    }
  });

  return generativeModel;
}

export async function POST(request: Request) {
  let mammothContent = ''; // Guardar o texto extraído para depuração
  try {
    const formData = await request.formData();
    const documentContent = formData.get('documentContent') as string;
    const prompt = formData.get('prompt') as string;
    const targetLanguage = formData.get('targetLanguage') as string || 'Português';
    const files = formData.getAll('files') as File[];

    let combinedContent = documentContent || '';

    // Lógica para processar os ficheiros enviados
    for (const file of files) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log(`[BACKEND] Processando o ficheiro DOCX: ${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        const { value } = await mammoth.extractRawText({ buffer });
        mammothContent += value; // Guardamos o conteúdo extraído
        combinedContent += `\n\n--- Conteúdo do Ficheiro: ${file.name} ---\n\n${value}`;
      }
    }

    if (!combinedContent.trim()) {
      return NextResponse.json({ error: 'O conteúdo do documento (texto ou ficheiro) não pode estar vazio.' }, { status: 400 });
    }

    const generativeModel = await initializeVertexAI(targetLanguage);
    const fullPrompt = `Instrução do usuário: "${prompt}".\n\n--- INÍCIO DO DOCUMENTO PARA ANÁLISE ---\n\n${combinedContent}\n\n--- FIM DO DOCUMENTO PARA ANÁLISE ---`;
    const result = await generativeModel.generateContent(fullPrompt);
    const functionCall = result.response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (functionCall && functionCall.name === "format_maintenance_manual") {
      return NextResponse.json(functionCall.args, { status: 200 });
    }
    
    const textResponse = result.response.candidates?.[0]?.content?.parts[0]?.text || "A IA não retornou texto.";
    
    // Se a IA não usar a ferramenta, retornamos um erro estruturado com dados de depuração
    return NextResponse.json({ 
        error: 'A IA não utilizou a ferramenta de formatação.',
        aiResponse: textResponse,
        mammothContent: mammothContent || null
    }, { status: 500 });

  } catch (error) {
    console.error('Erro na API Route (Vertex AI):', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ 
        error: `Erro interno do servidor: ${errorMessage}`,
        mammothContent: mammothContent || null
    }, { status: 500 });
  }
}