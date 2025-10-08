import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: Request) {
  try {
    // 1. Recebe os dados do formulário, que inclui o arquivo
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // 2. Converte o arquivo para um formato que o Mammoth entende (Buffer)
    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. A mágica acontece aqui: mammoth converte o DOCX para HTML
    // Usamos 'convertToHtml' para que as imagens sejam embutidas como base64
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    // 4. Envia o HTML gerado de volta para o frontend
    return NextResponse.json({ html });

  } catch (error) {
    console.error('Erro ao processar o DOCX:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
