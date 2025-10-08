import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as cheerio from 'cheerio';

// Esta função auxiliar do Ollama permanece a mesma, mas usaremos um prompt diferente
async function runOllamaTranslator(text: string, language: string): Promise<string> {
  const prompt = `[INST]
Você é um tradutor de documentos técnicos. Sua tarefa é traduzir o conteúdo HTML a seguir para o idioma '${language}'.
O texto contém placeholders especiais no formato '[imagem_X_aqui]'.
É ABSOLUTAMENTE CRUCIAL que você preserve esses placeholders exatamente como estão e em suas posições originais no texto. NÃO os traduza. NÃO os mova.

Traduza todo o texto ao redor dos placeholders e mantenha-os intactos.
[/INST]

CONTEÚDO PARA TRADUZIR:
${text}`;
  
  return new Promise((resolve, reject) => {
    const ollamaPath = 'C:\\Users\\dinho\\AppData\\Local\\Programs\\Ollama\\ollama.exe';
    const ollama = spawn(ollamaPath, ['run', 'mistral']);
    let output = '';
    let errorOutput = '';

    ollama.stdout.on('data', (data) => { output += data.toString(); });
    ollama.stderr.on('data', (data) => { errorOutput += data.toString(); });

    ollama.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Ollama falhou com o código ${code}. Erro: ${errorOutput}`));
      }
      const cleanOutput = output.split('[/INST]').pop()?.trim() || output.trim();
      resolve(cleanOutput);
    });

    ollama.on('error', (err) => reject(err));
    ollama.stdin.write(prompt);
    ollama.stdin.end();
  });
}


export async function POST(request: Request) {
  console.time('Tempo total de tradução (FAST)');
  try {
    const { html, language } = await request.json();
    if (!html || !language) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const $ = cheerio.load(html);
    const imageMap: { [key: string]: string } = {};
    let imageCounter = 0;

    // --- ETAPA 1: PRÉ-PROCESSAMENTO ---
    // Encontra todas as imagens, as guarda no 'imageMap' e as substitui por placeholders.
    $('img').each(function () {
      imageCounter++;
      const placeholder = `[imagem_${imageCounter}_aqui]`;
      const imageHtml = $.html(this as cheerio.Element);
      imageMap[placeholder] = imageHtml;
      $(this).replaceWith(placeholder);
    });

    const htmlWithPlaceholders = $('body').html() || '';
    
    // --- ETAPA 2: CHAMADA ÚNICA À IA ---
    console.log(`Enviando HTML com ${imageCounter} placeholders para a IA...`);
    let translatedHtmlWithPlaceholders = await runOllamaTranslator(htmlWithPlaceholders, language);
    
    // --- ETAPA 3: PÓS-PROCESSAMENTO ---
    // Verificação de contagem de placeholders que você sugeriu
    const originalPlaceholderCount = imageCounter;
    const returnedPlaceholderCount = (translatedHtmlWithPlaceholders.match(/\[imagem_\d+_aqui\]/g) || []).length;

    console.log(`Placeholders enviados: ${originalPlaceholderCount}. Placeholders recebidos: ${returnedPlaceholderCount}`);
    
    if (originalPlaceholderCount !== returnedPlaceholderCount) {
        // Notifica o frontend que a IA falhou em preservar os placeholders
        return NextResponse.json({ 
            error: `A IA não preservou os placeholders. Esperado: ${originalPlaceholderCount}, Recebido: ${returnedPlaceholderCount}. É necessária revisão manual.`,
            requiresManualReview: true,
            // Mesmo com erro, enviamos o que temos para o usuário tentar corrigir
            translatedHtml: translatedHtmlWithPlaceholders 
        }, { status: 500 });
    }
    
    // Reinsere as imagens nos locais dos placeholders
    for (const placeholder in imageMap) {
        // Usamos uma RegEx global para substituir todas as ocorrências, caso a IA duplique uma
        const regex = new RegExp(placeholder.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g');
        translatedHtmlWithPlaceholders = translatedHtmlWithPlaceholders.replace(regex, imageMap[placeholder]);
    }

    console.timeEnd('Tempo total de tradução (FAST)');
    return NextResponse.json({ translatedHtml: translatedHtmlWithPlaceholders });

  } catch (error) {
      console.timeEnd('Tempo total de tradução (FAST)');
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro na API de tradução rápida:', errorMessage);
      return NextResponse.json({ error: `Erro interno do servidor: ${errorMessage}` }, { status: 500 });
  }
}
