// src/services/NcmService.ts

import axios from 'axios';
import Fuse from 'fuse.js';

interface NcmEntry {
    code: string;
    description: string;
}

export class NcmService {
    private static instance: NcmService;
    private fuse: Fuse<NcmEntry> | null = null;
    private isLoaded: boolean = false;
    
    private NCM_DATA_URL = 'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json?perfil=PUBLICO'; 

    private constructor() {
        this.initialize();
    }

    public static getInstance(): NcmService {
        if (!NcmService.instance) {
            NcmService.instance = new NcmService();
        }
        return NcmService.instance;
    }
    
    // Inicializa o serviço e carrega os dados em segundo plano
    private async initialize() {
        if (!this.isLoaded) {
            await this.loadNcmData();
        }
    }
    
    // 1. Baixa o JSON da NCM da Receita Federal.
    // 2. Constrói o índice Fuse.js para pesquisa rápida.
     
     private async loadNcmData(): Promise<void> {
        console.log('NCMService: Iniciando coleta e indexação de dados...');
        
        try {
            const response = await axios.get<any>(this.NCM_DATA_URL);
            
            // ⚠️ AJUSTE AQUI: O array de NCMs geralmente está aninhado dentro de uma chave (ex: 'nomenclaturas')
            const ncmArray = response.data.nomenclaturas || response.data.lista || response.data;

            if (!Array.isArray(ncmArray)) {
                // Se o JSON não estiver formatado como esperado, lança um erro claro.
                throw new Error("O JSON da API NCM não contém um array de dados na chave esperada.");
            }
            
            // Mapeamento EXATO para o formato do Fuse.js (usando o array que acabamos de extrair)
            const rawData: NcmEntry[] = ncmArray.map((item: any) => ({
                code: item.codigo,       // Ajuste a chave se não for 'codigo'
                description: item.descricao // Ajuste a chave se não for 'descricao'
            }));

            // 2. INDEXAR OS DADOS USANDO FUSE.JS
            const fuseOptions: Fuse.IFuseOptions<NcmEntry> = {
                keys: ['code', 'description'], 
                threshold: 0.3, // Permite alguma tolerância na escrita (Fuzzy Search)
                ignoreLocation: true,
                includeScore: true 
            };

            this.fuse = new Fuse(rawData, fuseOptions);
            this.isLoaded = true;
            console.log(`NCMService: ${rawData.length} NCMs indexadas com sucesso.`);
            
        } catch (error) {
            console.error('NCMService: Falha ao carregar dados NCM. Verifique a URL e o formato do JSON.', error);
            this.isLoaded = false;
        }
    }

     // Busca um NCM baseado em uma palavra-chave usando Fuzzy Search.
     // @param keyword Palavra-chave do produto (ex: "celular")
     
    public async search(keyword: string): Promise<NcmEntry[]> {
        if (!this.isLoaded || !this.fuse) {
            // Se a busca for feita antes do índice carregar, tenta inicializar novamente.
            if (!this.isLoaded) await this.initialize();
            if (!this.fuse) throw new Error("O índice NCM não está disponível. Tente novamente em instantes.");
        }

        // Executa a busca fuzzy
        const fuseResults = this.fuse.search(keyword);

        // Mapeia o resultado do Fuse e limita a 10 resultados
        return fuseResults
            .slice(0, 10) 
            .map(result => result.item);
    }
}