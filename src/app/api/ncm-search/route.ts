import { NextResponse } from 'next/server';
import { OpenFiscalService } from '@/services/OpenFiscalService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Padronizado para 'description'
  const description = searchParams.get('description');

  if (!description || description.length < 3) {
    return NextResponse.json({ error: 'A descrição para busca deve ter pelo menos 3 caracteres.' }, { status: 400 });
  }

  try {
    const service = OpenFiscalService.getInstance();
    // A chamada agora está correta:
    const results = service.searchNcmByDescription(description);
    
    return NextResponse.json({ query: description, count: results.length, results });
  } catch (error: any) {
    console.error('Erro na busca NCM:', error.message);
    // Retorna um erro amigável ao frontend
    return NextResponse.json({ error: 'Erro interno ao buscar NCM. Verifique os logs do servidor.' }, { status: 500 });
  }
}
