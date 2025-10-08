import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as cheerio from 'cheerio';

/**
 * Executa o tradutor Ollama para um único trecho de texto.
 * @param text O texto a ser traduzido.
 * @param language O idioma de destino.
 * @returns Uma Promise que resolve com o texto traduzido.
 */
async function runOllamaTranslator(text: string, language: string): Promise<string> {
  // Prompt simplificado, focado em traduzir apenas um trecho por vez.
  const prompt = `[INST]Você é uma API de tradução. Traduza o texto a seguir para o idioma '${language}'. Responda APENAS com o texto traduzido, sem introduções, comentários ou a sua própria pergunta.[/INST]\n\nTEXTO: ${text}`;
  
  return new Promise((resolve, reject) => {
    // Caminho completo para o executável do Ollama para evitar erros de PATH.
    const ollamaPath = 'C:\\Users\\dinho\\AppData\\Local\\Programs\\Ollama\\ollama.exe';
    const ollama = spawn(ollamaPath, ['run', 'mistral']);

    let output = '';
    let errorOutput = '';

    ollama.stdout.on('data', (data) => {
      output += data.toString();
    });

    ollama.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ollama.on('close', (code) => {
      if (code !== 0) {
        console.error(`Ollama stderr completo: ${errorOutput}`);
        return reject(new Error(`Ollama falhou com o código ${code} para o texto: "${text}"`));
      }
      // Limpa a resposta para pegar apenas a tradução.
      const cleanOutput = output.split('[/INST]').pop()?.trim() || output.trim();
      resolve(cleanOutput);
    });

    ollama.on('error', (err) => {
      reject(err);
    });

    // Envia o prompt para o processo do Ollama.
    ollama.stdin.write(prompt);
    ollama.stdin.end();
  });
}

/**
 * Handler da API para receber um HTML, traduzir seu conteúdo e retorná-lo.
 */
export async function POST(request: Request) {
  try {
    const { html, language } = await request.json();

    if (!html || !language) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const $ = cheerio.load(html);

    // Extrai todos os elementos que contêm texto.
    const textElements: cheerio.Element[] = [];
    $('p, h1, h2, h3, h4, li, th, td').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 0) {
        textElements.push(element);
      }
    });
    
    // Se não houver texto, retorna o HTML original.
    if (textElements.length === 0) {
      return NextResponse.json({ translatedHtml: html });
    }
    
    // --- Início do Bloco de Depuração de Performance ---
    console.log(`Iniciando a tradução de ${textElements.length} trechos de texto...`);
    console.time('Tempo total de tradução'); // Inicia o cronômetro.

    // Cria uma lista de promessas, uma para cada tradução.
    const translationPromises = textElements.map(el => {
      const originalText = $(el).text();
      return runOllamaTranslator(originalText, language);
    });

    // Executa todas as promessas de tradução em paralelo.
    const translatedPieces = await Promise.all(translationPromises);
    
    console.timeEnd('Tempo total de tradução'); // Para o cronômetro e exibe o tempo no console.
    // --- Fim do Bloco de Depuração de Performance ---

    // Reinjeta os textos traduzidos nos elementos HTML.
    textElements.forEach((element, index) => {
      $(element).text(translatedPieces[index]);
    });

    // Retorna o HTML final com o conteúdo traduzido.
    return NextResponse.json({ translatedHtml: $.html() });

  } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro na API de tradução:', errorMessage);
      return NextResponse.json({ error: `Erro interno do servidor: ${errorMessage}` }, { status: 500 });
  }
}