import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto inválido.' }, { status: 400 });
    }

    const sanitizedText = await runOllamaSanitizer(text);
    return NextResponse.json({ sanitizedText }, { status: 200 });

  } catch (error) {
    console.error('Erro na sanitização local:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

async function runOllamaSanitizer(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ollama = spawn('ollama', ['run', 'mistral'], { stdio: ['pipe', 'pipe', 'inherit'] });

    let output = '';
    ollama.stdout.on('data', (data) => {
      output += data.toString();
    });

    ollama.stdin.write(`Sanitize the following document. Remove company names, personal names, and sensitive identifiers. Preserve technical terms and instructions.\n\n${text}`);
    ollama.stdin.end();

    ollama.on('close', () => resolve(output.trim()));
    ollama.on('error', reject);
  });
}
