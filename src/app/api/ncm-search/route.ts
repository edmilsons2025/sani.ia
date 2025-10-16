import { NextRequest, NextResponse } from 'next/server';
import { NcmService } from '@/services/NcmService'; 

// Endpoint da API para buscar NCM por nome (Fuzzy Search).
//
// Exemplo de uso: GET /api/ncm-search?name=celular
// @param request NextRequest
// @returns NextResponse com os resultados

export async function GET(request: NextRequest) {
    // 1. EXTRAI O PARÂMETRO 'description' DA URL
    const searchParams = request.nextUrl.searchParams;
    const description = searchParams.get('description');

    // 2. VALIDAÇÃO BÁSICA
    if (!description || description.trim() === '') {
        return NextResponse.json(
            { error: 'Parâmetro "description" (palavra-chave de busca) é obrigatório.' }, 
            { status: 400 }
        );
    }

    try {
        // 3. OBTÉM A INSTÂNCIA DO SERVIÇO (que carrega os dados NCM)
        const ncmService = NcmService.getInstance();

        // 4. EXECUTA A BUSCA FUZZY
        // O serviço faz a busca rápida no índice de NCMs carregado localmente.
        const apiResponse = await ncmService.search(description);

        // 5. RETORNA O RESULTADO COM SUCESSO
        return NextResponse.json({ 
            ...apiResponse,
            query: description,
        });

    } catch (error) {
        console.error('Erro ao buscar NCM:', error);

        // 6. TRATAMENTO DE ERRO (incluindo falha de carregamento do índice)
        return NextResponse.json(
            { error: 'Erro interno do servidor ao processar a busca. Verifique se o índice NCM foi carregado corretamente (logs).' }, 
            { status: 500 }
        );
    }
}
