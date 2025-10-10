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
    // CORREÇÃO FINAL PARA VERCEL: Usa a pasta /public, que é sempre incluída
    // no ambiente de runtime. O arquivo será copiado para a raiz da função.
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
        throw new Error('Falha na inicialização do serviço fiscal: banco de dados indisponível. Confirme se o arquivo DB está em /public.');
    }
  }

  public static getInstance(): OpenFiscalService {
    if (!OpenFiscalService.instance) {
      OpenFiscalService.instance = new OpenFiscalService();
    }
    return OpenFiscalService.instance;
  }

  // Lógica de busca otimizada para FTS5 com prefixos
  public searchNcmByDescription(description: string): NcmData[] {
    
    // Filtros para FTS5 (ignora palavras curtas e comuns)
    const stopWords = ['de', 'da', 'do', 'e', 'a', 'o', 'para', 'com'];
    
    const termos = description.trim()
        .replace(/[.,]/g, '') 
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length >= 3 && !stopWords.includes(term));

    if (termos.length === 0) {
        return []; 
    }

    // Cria a query FTS5 usando operador OR e prefixo (*) para busca fuzzy: "termo1* OR termo2*..."
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
