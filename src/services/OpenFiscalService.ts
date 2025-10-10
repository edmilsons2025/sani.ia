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
    // Tratamento: remove pontos e monta a busca FTS5 (AND)
    const termoBusca = description.trim().replace(/[.]/g, '').split(/\s+/).join(' AND ');
    
    if (!termoBusca) return [];

    const stmt = this.db.prepare(`
      SELECT DISTINCT ncm, descricao
      FROM ibpt_search
      WHERE descricao MATCH ?
      ORDER BY rank
      LIMIT 15
    `);
    
    // 3. Correção 2: Coerção de tipo para informar o TypeScript sobre a estrutura de retorno
    return stmt.all(termoBusca) as NcmData[];
  }

  public filterByPrefix(prefix: string): NcmData[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT ncm, descricao
      FROM ibpt_taxes
      WHERE ncm LIKE ?
      LIMIT 20
    `);
    // 4. Correção 3: Coerção de tipo para informar o TypeScript sobre a estrutura de retorno
    return stmt.all(`${prefix}%`) as NcmData[];
  }
}
