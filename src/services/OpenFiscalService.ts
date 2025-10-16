import path from 'path';
import Database from 'better-sqlite3';

// Definição de tipos para o resultado da busca FTS5
interface NcmData {
  ncm: string;
  descricao: string;
}

export class OpenFiscalService {
  private static instance: OpenFiscalService;
  private db: Database.Database;

  private constructor() {
    // CORREÇÃO CRÍTICA PARA VERCEL: 
    // Garante que o caminho seja resolvido a partir da raiz do projeto, na pasta 'public',
    // onde o Next.js garante que o arquivo estático será copiado.
    const dbPath = path.join(process.cwd(), 'public', 'openfiscal.db');
    
    try {
        console.log(`[OpenFiscalService] Tentando abrir banco de dados em: ${dbPath}`);
        // Abrindo o banco de dados em modo somente leitura.
        this.db = new Database(dbPath, { readonly: true });
        console.log(`[OpenFiscalService] Conexão SQLite estabelecida com sucesso.`);
    } catch (e: unknown) {
        const error = e as Error;
        console.error(`[OpenFiscalService] ERRO CRÍTICO ao abrir DB: ${error.message}`);
        console.error(`[OpenFiscalService] DB Path usado: ${dbPath}`);
        // Lança o erro, que será pego pelo route.ts e retornará o 500
        throw new Error('Falha na inicialização do serviço fiscal: banco de dados indisponível no servidor.');
    }
  }

  public static getInstance(): OpenFiscalService {
    if (!OpenFiscalService.instance) {
      OpenFiscalService.instance = new OpenFiscalService();
    }
    return OpenFiscalService.instance;
  }

  // Lógica de busca otimizada (FTS5 Prefix Search)
  public searchNcmByDescription(description: string): NcmData[] {
    
    const stopWords = ['de', 'da', 'do', 'e', 'a', 'o', 'para', 'com'];
    
    const termos = description.trim()
        .replace(/[.,]/g, '') 
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length >= 3 && !stopWords.includes(term));

    if (termos.length === 0) {
        return []; 
    }

    // "placa* OR mãe*"
    const termoBusca = termos.map(term => `${term}*`).join(' OR ');

    const stmt = this.db.prepare(`
      SELECT DISTINCT ncm, descricao
      FROM ibpt_search
      WHERE descricao MATCH ?
      ORDER BY rank
      LIMIT 25
    `);
    
    return stmt.all(termoBusca) as NcmData[]; 
  }

  public filterByPrefix(prefix: string): NcmData[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT ncm, descricao
      FROM ibpt_taxes
      WHERE ncm LIKE ?
      LIMIT 20
    `);
    return stmt.all(`${prefix}%`) as NcmData[];
  }
}
