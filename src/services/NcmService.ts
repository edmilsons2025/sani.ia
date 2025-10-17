// src/services/NcmService.ts

// --- Tipagem ---
export interface NcmResultFromApi {
  ncm: string;
  descricao: string;
  score: number;
  source: string;
}

// --- Classe de Serviço (Padrão Singleton) ---
export class NcmService {
  private static instance: NcmService;
  private readonly apiUrl: string;

  private constructor() {
    // Garante que a URL da API seja lida de variáveis de ambiente
    this.apiUrl = process.env.NEXT_PUBLIC_NCM_API_URL || 'http://risetech.dns.army:8000';
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
    const url = `${this.apiUrl}/api/ncm-search?description=${encodeURIComponent(description)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha na busca de NCM: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
  }

  /**
   * **NOVO MÉTODO**
   * Envia uma sugestão de classificação de NCM para a API.
   * @param originalQuery O nome/descrição original do produto.
   * @param ncm O objeto NCMResultFromApi que foi selecionado manualmente.
   */
  public async submitSuggestion(originalQuery: string, ncm: Omit<NcmResultFromApi, 'score' | 'source'>): Promise<void> {
    const url = `${this.apiUrl}/api/ncm-suggestion`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_query: originalQuery,
        ncm: ncm.ncm,
        descricao: ncm.descricao,
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao enviar sugestão: ${response.statusText}`);
    }
  }
}