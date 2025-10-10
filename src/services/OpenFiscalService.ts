import path from 'path';
import Database from 'better-sqlite3';

// 1. Define a interface esperada para os resultados da busca
interface NcmData {
  ncm: string;
  descricao: string;
}

export class OpenFiscalService {
  private static instance: OpenFiscalService;
  private db: Database.Database;

  private constructor() {
    const dbPath = path.join(process.cwd(), 'src', 'data', 'openfiscal.db');

    try {
      // Abre o banco de dados em modo somente leitura (readonly: true)
      this.db = new Database(dbPath, { readonly: true });
      console.log(`[OpenFiscalService] Conexão SQLite estabelecida em: ${dbPath}`);
    } catch (e: unknown) { // 2. Correção 1: Uso de 'unknown' em vez de 'any' para o catch
      const error = e as Error; // Coerção segura para usar a propriedade 'message'
      console.error(`[OpenFiscalService ERROR] Falha ao abrir o banco de dados em: ${dbPath}`);
      console.error(`[OpenFiscalService ERROR] Detalhes: ${error.message}`);
      // Lança o erro para ser pego pela API Route (gerando o 500)
      throw new Error("Falha na inicialização do serviço fiscal. Verifique se o DB existe.");
    }
  }

  public static getInstance(): OpenFiscalService {
    if (!OpenFiscalService.instance) {
      OpenFiscalService.instance = new OpenFiscalService();
    }
    return OpenFiscalService.instance;
  }

  public searchNcmByDescription(description: string): NcmData[] {
    // Lista de palavras comuns (stopwords) que devem ser ignoradas na busca
    const stopWords = ['de', 'da', 'do', 'e', 'a', 'o', 'para', 'em', 'um', 'uma'];
    
    // 1. Limpa o texto, remove pontuação e filtra termos curtos ou stopwords
    const termos = description.trim()
        .replace(/[.,]/g, '') 
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length >= 3 && !stopWords.includes(term));

    if (termos.length === 0) {
      // Se não houver termos válidos para buscar, retorna vazio
      return []; 
    }

    // 2. Cria a string de busca: "termo1* OR termo2* OR termo3*"
    // O operador OR e o prefixo * (coringa) tornam a busca muito mais flexível
    const termoBusca = termos.map(term => `${term}*`).join(' OR ');

    // 3. Executa a busca FTS5 otimizada
    const stmt = this.db.prepare(`
      SELECT DISTINCT ncm, descricao
      FROM ibpt_search
      WHERE descricao MATCH ?
      ORDER BY rank
      LIMIT 25 
    `);
    
    // Coerção de tipo para informar o TypeScript sobre a estrutura de retorno
    return stmt.all(termoBusca) as NcmData[];
  }

  public filterByPrefix(prefix: string): NcmData[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT ncm, descricao
      FROM ibpt_taxes
      WHERE ncm LIKE ?
      LIMIT 20
    `);
    // Coerção de tipo para informar o TypeScript sobre a estrutura de retorno
    return stmt.all(`${prefix}%`) as NcmData[];
  }
}
