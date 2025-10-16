export interface NcmResultFromApi {
    ncm: string;
    descricao: string;
    score: number;
    source: string;
}

class NcmService {
    private static instance: NcmService;
    private readonly API_URL: string;

    private constructor() {
        // Acessa a variável de ambiente. 
        this.API_URL = process.env.NEXT_PUBLIC_NCM_SEARCH_URL || 'http://localhost:8000/api/v1/ncm';
        
        if (!this.API_URL) {
            console.error("Variável de ambiente NEXT_PUBLIC_NCM_SEARCH_URL não está definida. Usando fallback.");
        }
    }

    public static getInstance(): NcmService {
        if (!NcmService.instance) {
            NcmService.instance = new NcmService();
        }
        return NcmService.instance;
    }

     // Realiza a busca semântica por NCM na API.
     // @param query A descrição do produto para buscar.
     // @returns Um array de resultados NcmResultFromApi.
     
    public async search(query: string): Promise<NcmResultFromApi[]> {
        if (!query.trim()) {
            return [];
        }

        const url = `${this.API_URL}?description=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Adicione aqui qualquer chave ou token de API necessário, 
                    // se for configurado no TupiNCM.
                },
                // Em um Server Component ou API Route, o 'cache: no-store' 
                // é bom para garantir dados frescos.
                cache: 'no-store' 
            });

            if (!response.ok) {
                // Tenta ler o erro do corpo da resposta
                let errorDetail = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
                throw new Error(`Falha na API: ${response.status} - ${errorDetail.detail || response.statusText}`);
            }

            const data = await response.json();
            // A API TupiNCM retorna uma lista de NCMs
            return data.results || [];

        } catch (error) {
            console.error(`Falha ao buscar NCMs para "${query}":`, error);
            // Re-throw para que o componente front-end possa capturar e mostrar o erro
            throw new Error('Não foi possível conectar ou processar a resposta da API NCM.');
        }
    }
}

export { NcmService };