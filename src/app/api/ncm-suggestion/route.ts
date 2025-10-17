// src/app/api/ncm-suggestion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod schema for validating the incoming suggestion payload
const SuggestionSchema = z.object({
  original_query: z.string().min(1, { message: "O campo 'original_query' é obrigatório." }),
  ncm: z.string().min(1, { message: "O campo 'ncm' é obrigatório." }),
  descricao: z.string().min(1, { message: "O campo 'descricao' é obrigatório." }),
});

/**
 * API endpoint to receive and process NCM classification suggestions from users.
 *
 * @param request The incoming NextRequest object.
 * @returns A NextResponse object.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate the request body
    const body = await request.json();
    const validation = SuggestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Payload inválido.", 
          details: validation.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }

    const { original_query, ncm, descricao } = validation.data;

    // 2. Log the suggestion for now
    // In a real application, you would save this to a database or send it to a message queue.
    console.log('--- Nova Sugestão de NCM Recebida ---');
    console.log(`Consulta Original: ${original_query}`);
    console.log(`NCM Sugerido: ${ncm}`);
    console.log(`Descrição: ${descricao}`);
    console.log('----------------------------------------');

    // 3. Respond with success
    return NextResponse.json(
      { message: "Sugestão recebida com sucesso!" },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro ao processar a sugestão de NCM:', error);

    // Handle JSON parsing errors or other unexpected issues
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar a sugestão." },
      { status: 500 }
    );
  }
}
