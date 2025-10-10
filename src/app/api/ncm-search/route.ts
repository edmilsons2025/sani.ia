import { NextResponse } from 'next/server';
import { OpenFiscalService } from '@/services/OpenFiscalService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // O nome do parâmetro deve ser 'description' para coincidir com a chamada do Service
  const description = searchParams.get('description'); 

  if (!description || description.length < 3) {
    return NextResponse.json({ error: 'Descrição inválida.' }, { status: 400 });
  }

  try {
    const service = OpenFiscalService.getInstance();
    const results = service.searchNcmByDescription(description);
    return NextResponse.json({ query: description, count: results.length, results });
  } catch (error: unknown) { // CORRIGIDO: Usando 'unknown'
    const err = error as Error; // Coerção de tipo para acessar 'message'
    console.error('Erro na busca NCM:', err.message);
    return NextResponse.json({ error: 'Erro interno ao buscar NCM. Verifique os logs do servidor.' }, { status: 500 });
  }
}
