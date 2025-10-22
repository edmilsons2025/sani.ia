// src/services/NcmService.ts
import axios from 'axios';
import { z } from 'zod';

// --- Zod Schema for Validation ---
const NcmResultSchema = z.object({
  ncm: z.string(),
  descricao: z.string(),
  score: z.number(),
  source: z.string(),
});

const ApiResponseSchema = z.object({
  results: z.array(NcmResultSchema),
});

// --- Tipagem ---
export type NcmResultFromApi = z.infer<typeof NcmResultSchema>;

// --- Classe de Serviço (Padrão Singleton) ---
export class NcmService {
  private static instance: NcmService;
  private readonly apiUrl: string;

  private constructor() {
    // Garante que a URL da API seja lida de variáveis de ambiente
    this.apiUrl = process.env.NEXT_PUBLIC_NCM_API_URL || 'http://localhost:8000';
    if (!this.apiUrl) {
      console.error("A URL da API NCM não está configurada em NEXT_PUBLIC_NCM_API_URL");
    }
  }

  /**
   * Obtém a instância única do serviço.
   */
  public static getInstance(): NcmService {
    if (!NcmService.instance) {
      NcmService.instance = new NcmService();
    }
    return NcmService.instance;
  }

  /**
   * Busca sugestões de NCM com base em uma descrição.
   * @param description A descrição do produto.
   */
  public async search(description: string): Promise<NcmResultFromApi[]> {
    try {
      const url = `${this.apiUrl}/api/ncm-search`;
      const response = await axios.get(url, {
        params: { description },
      });

      // Valida e parseia a resposta da API com Zod
      const validatedData = ApiResponseSchema.parse(response.data);
      return validatedData.results;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Erro na busca de NCM (Axios):', error.response?.data || error.message);
        throw new Error(`Falha na busca de NCM: ${error.response?.data?.error || error.message}`);
      } else if (error instanceof z.ZodError) {
        console.error('Erro de validação da resposta da API NCM:', error.issues);
        throw new Error('A resposta da API de NCM está em um formato inesperado.');
      } else {
        console.error('Erro inesperado na busca de NCM:', error);
        throw new Error('Ocorreu um erro inesperado ao buscar o NCM.');
      }
    }
  }

  /**
   * **NOVO MÉTODO**
   * Envia uma sugestão de classificação de NCM para a API.
   * @param originalQuery O nome/descrição original do produto.
   * @param ncm O objeto NCMResultFromApi que foi selecionado manualmente.
   */
  public async submitSuggestion(originalQuery: string, ncm: Omit<NcmResultFromApi, 'score' | 'source'>): Promise<void> {
    try {
      const url = `${this.apiUrl}/api/ncm-suggestion`;
      await axios.post(url, {
        original_query: originalQuery,
        ncm: ncm.ncm,
        descricao: ncm.descricao,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Erro ao enviar sugestão (Axios):', error.response?.data || error.message);
        throw new Error(`Falha ao enviar sugestão: ${error.response?.data?.error || error.message}`);
      } else {
        console.error('Erro inesperado ao enviar sugestão:', error);
        throw new Error('Ocorreu um erro inesperado ao enviar a sugestão.');
      }
    }
  }
}