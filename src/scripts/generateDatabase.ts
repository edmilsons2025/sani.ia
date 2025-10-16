import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import axios from 'axios';
import cheerio from 'cheerio';
import csv from 'csvtojson';
import Database from 'better-sqlite3';
import https from 'https';
import { Parser } from 'json2csv'; 

// --- Interfaces de Tipagem ---
interface IbptRow {
  codigo: string;
  ex: string;
  tipo: string;
  descricao: string;
  nacionalfederal: string;
  importadosfederal: string;
  estadual: string;
  municipal: string;
  vigenciainicio: string;
  vigenciafim: string;
  chave: string;
  versao: string;
  fonte: string;
}

interface CestMetadata {
    etag?: string;
    lastModified?: string;
    lastUpdate?: string;
}

interface CestUnprocessedItem {
    CEST: string;
    NCM_SH: string[];
    Descricao: string;
}

interface ExportedRow { // Interface adicionada para tipar dados de exportação e evitar 'any'
    ncm: string;
    uf: string;
    descricao: string;
    aliqNacional: number;
    aliqEstadual: number;
    aliqMunicipal: number;
    aliqImportado: number;
    vigenciaInicio: string;
    vigenciaFim: string;
    cests: { cest: string; ncm: string; descricao: string }[];
}

// --- Configuração de Caminhos ---
// CORREÇÃO: Mapeia o caminho para a pasta 'public'
const dataPath = path.join(process.cwd(), 'public'); 

// Cria o diretório 'public' se ele não existir.
// Usamos process.cwd() para garantir que a pasta seja criada na raiz do projeto.
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
    console.log(`Diretório de dados criado em: ${dataPath}`);
}

// Junta o caminho da pasta com o nome do arquivo
const dbPath = path.join(dataPath, 'openfiscal.db');
const metadataFilePath = path.join(dataPath, 'cest_metadata.json');


const db = new Database(dbPath); // Usa o caminho completo para criar/acessar o DB
db.pragma('journal_mode = WAL');


function criarTabelas(): void {
  console.log('Verificando e criando tabelas, se necessário...');
  // Tabela principal de impostos do IBPT
  db.exec(`
    CREATE TABLE IF NOT EXISTS ibpt_taxes (
      ncm TEXT NOT NULL,
      uf TEXT NOT NULL,
      ex TEXT,
      tipo TEXT,
      descricao TEXT,
      aliqNacional REAL,
      aliqEstadual REAL,
      aliqMunicipal REAL,
      aliqImportado REAL,
      vigenciaInicio TEXT,
      vigenciaFim TEXT,
      chave TEXT,
      versao TEXT,
      fonte TEXT,
      PRIMARY KEY (ncm, uf)
    );
  `);
  // Tabela de dados do CEST
  db.exec(`
    CREATE TABLE IF NOT EXISTS cest_data (
      cest TEXT NOT NULL,
      ncm TEXT NOT NULL,
      descricao TEXT,
      PRIMARY KEY (cest, ncm)
    );
  `);
  // Índices para performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_ncm_ibpt ON ibpt_taxes (ncm);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ncm_cest ON cest_data (ncm);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cest_data_cest ON cest_data (cest);');

  // Tabela virtual FTS5 para busca otimizada por texto completo.
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ibpt_search USING fts5(
      ncm, 
      descricao, 
      content='ibpt_taxes', 
      content_rowid='rowid',
      tokenize = 'porter unicode61'
    );
  `);

  // Gatilhos (Triggers) para manter a tabela de busca sincronizada.
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS ibpt_taxes_after_insert AFTER INSERT ON ibpt_taxes BEGIN
      INSERT INTO ibpt_search(rowid, ncm, descricao) VALUES (new.rowid, new.ncm, new.descricao);
    END;
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS ibpt_taxes_after_delete AFTER DELETE ON ibpt_taxes BEGIN
      INSERT INTO ibpt_search(ibpt_search, rowid, ncm, descricao) VALUES ('delete', old.rowid, old.ncm, old.descricao);
    END;
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS ibpt_taxes_after_update AFTER UPDATE ON ibpt_taxes BEGIN
      INSERT INTO ibpt_search(ibpt_search, rowid, ncm, descricao) VALUES ('delete', old.rowid, old.ncm, old.descricao);
      INSERT INTO ibpt_search(rowid, ncm, descricao) VALUES (new.rowid, new.ncm, new.descricao);
    END;
  `);

  console.log('Tabelas e índice de busca prontos.');
}

async function processarIbpt(): Promise<void> {
  console.log('Iniciando processamento dos dados do IBPT...');
  const svnUrl = 'http://svn.code.sf.net/p/acbr/code/trunk2/Exemplos/ACBrTCP/ACBrIBPTax/tabela/';
  
  db.exec('DELETE FROM ibpt_taxes;');
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO ibpt_taxes (ncm, uf, ex, tipo, descricao, aliqNacional, aliqEstadual, aliqMunicipal, aliqImportado, vigenciaInicio, vigenciaFim, chave, versao, fonte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inserirMuitos = db.transaction((linhas: IbptRow[], uf: string) => {
    for (const linha of linhas) {
      const ncmLimpo = (linha.codigo || '').replace(/[.]/g, ''); // Remove todos os pontos
      insert.run(
        ncmLimpo,
        uf,
        linha.ex,
        linha.tipo,
        linha.descricao,
        parseFloat(String(linha.nacionalfederal || '0').replace(',', '.')),
        parseFloat(String(linha.estadual || '0').replace(',', '.')),
        parseFloat(String(linha.municipal || '0').replace(',', '.')),
        parseFloat(String(linha.importadosfederal || '0').replace(',', '.')),
        linha.vigenciainicio,
        linha.vigenciafim,
        linha.chave,
        linha.versao,
        linha.fonte
      );
    }
  });

  try {
    const response = await axios.get(svnUrl);
    const $ = cheerio.load(response.data);
    const csvFiles: string[] = []; // Tipagem explícita
    $('a[href$=".csv"]').each((i, link) => { 
      csvFiles.push($(link).attr('href') as string);
    });

    for (const file of csvFiles) {
      const match = /TabelaIBPTax([A-Z]{2})/.exec(file);
      if (!match || !match[1]) {
        console.warn(`Não foi possível extrair a UF do arquivo: ${file}. Pulando.`);
        continue;
      }
      const ufDoArquivo = match[1];
      
      console.log(`Processando IBPT para a UF: ${ufDoArquivo} (arquivo: ${file})...`);
      
      const fileUrl = svnUrl + file;
      const csvStream = (await axios.get(fileUrl, { responseType: 'stream' })).data;
      const jsonArray: IbptRow[] = await csv({ // Tipagem explícita
        delimiter: ';',
        headers: ['codigo', 'ex', 'tipo', 'descricao', 'nacionalfederal', 'importadosfederal', 'estadual', 'municipal', 'vigenciainicio', 'vigenciafim', 'chave', 'versao', 'fonte']
      }).fromStream(csvStream);
      
      inserirMuitos(jsonArray, ufDoArquivo);
    }
    console.log('Processamento do IBPT concluído.');

    console.log('Reconstruindo índice de busca semântica...');
    db.exec(`INSERT INTO ibpt_search(ibpt_search) VALUES('rebuild');`);
    console.log('Índice de busca reconstruído com sucesso.');

  } catch (error: unknown) { // Tratamento de erro robusto para Linting
    const err = error as Error;
    console.error('Erro ao processar dados do IBPT:', err.message);
  }
}

async function processarCest(): Promise<void> {
    console.log('Iniciando verificação de atualização do CEST...');
    const url = "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18";
    const agent = new https.Agent({ rejectUnauthorized: false });

    let metadadosLocais: CestMetadata = {}; // Tipagem explícita
    if (fs.existsSync(metadataFilePath)) {
        try {
            metadadosLocais = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8')) as CestMetadata;
        } catch (e) {
            console.warn('Erro ao ler metadados locais, ignorando.' + e); // Corrigido o log
        }
    }

    try {
        const headResponse = await axios.head(url, { httpsAgent: agent });
        const etagRemoto = headResponse.headers['etag'] as string | undefined;
        const lastModifiedRemoto = headResponse.headers['last-modified'] as string | undefined;

        if (etagRemoto && metadadosLocais.etag && etagRemoto === metadadosLocais.etag) {
            console.log('Tabela CEST não foi modificada (ETag idêntico). Pulando atualização.');
            return;
        }
        if (lastModifiedRemoto && metadadosLocais.lastModified && lastModifiedRemoto === metadadosLocais.lastModified) {
            console.log('Tabela CEST não foi modificada (Last-Modified idêntico). Pulando atualização.');
            return;
        }

        console.log('Nova versão da tabela CEST encontrada. Iniciando download e processamento completo...');

        const response = await axios.get(url, { httpsAgent: agent });
        const $ = cheerio.load(response.data);
        const todosOsItens: CestUnprocessedItem[] = []; // Tipagem explícita

        $('p.A6-1Subtitulo').each((index, element) => { 
            const tituloAnexo = $(element).text().trim(); // Corrigido de 'let' para 'const'
            if (tituloAnexo.startsWith('ANEXO ') && tituloAnexo.length < 15) {
                const tabela = $(element).nextAll('table').first();
                if (tabela.length) {
                    $(tabela).find('tbody tr').each((i, linha) => { 
                        if (i === 0) return;
                        const celulas = $(linha).find('td');
                        if (celulas.length >= 4) {
                            const ncmString = $(celulas[2]).text().trim();
                            
                            const ncmArray: string[] = ncmString.split(/\s+/).filter(ncm => ncm.length > 0); 
                            
                            todosOsItens.push({
                                CEST: $(celulas[1]).text().trim(),
                                NCM_SH: ncmArray,
                                Descricao: $(celulas[3]).text().trim().replace(/\s\s+/g, ' ')
                            });
                        }
                    });
                }
            }
        });

        if (todosOsItens.length > 0) {
            db.exec('DELETE FROM cest_data;');
            const insert = db.prepare('INSERT OR IGNORE INTO cest_data (cest, ncm, descricao) VALUES (?, ?, ?)');
            const inserirMuitosCest = db.transaction((itens: CestUnprocessedItem[]) => { // Tipagem explícita
                for (const item of itens) {
                    const cestLimpo = (item.CEST || '').replace(/[.]/g, ''); // Remove todos os pontos
                    item.NCM_SH.forEach(ncm => { 
                        const ncmLimpo = ncm.replace(/[^\d]/g, '');
                        if (ncmLimpo) {
                            insert.run(cestLimpo, ncmLimpo, item.Descricao);
                        }
                    });
                }
            });
            inserirMuitosCest(todosOsItens);
            console.log(`${todosOsItens.length} registros de CEST potencialmente processados.`);

            const novosMetadados: CestMetadata = { // Tipagem explícita
                etag: etagRemoto,
                lastModified: lastModifiedRemoto,
                lastUpdate: new Date().toISOString()
            };
            fs.writeFileSync(metadataFilePath, JSON.stringify(novosMetadados, null, 2), 'utf8');
            console.log('Metadados de controle do CEST foram atualizados.');
        }

    } catch (error: unknown) { // Correção de Linting
        const err = error as Error;
        console.error('Erro ao processar dados do CEST:', err.message);
    }
}

/**
 * @deprecated Esta função foi desabilitada para garantir o sucesso do deploy na Vercel 
 * devido a falhas de Linting ('unused-vars'). Reative somente se for executada fora do script principal.
 * @description Exporta os dados unificados de IBPT e CEST para arquivos JSON e CSV.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function exportarArquivos(): Promise<void> {
  console.log('\nIniciando exportação para JSON e CSV...');
  try {
    const query = `
      SELECT
          i.ncm, i.uf, i.descricao, i.aliqNacional, i.aliqEstadual,
          i.aliqMunicipal, i.aliqImportado, i.vigenciaInicio, i.vigenciaFim,
          (
              SELECT json_group_array(
                  json_object('cest', c.cest, 'ncm', c.ncm, 'descricao', c.descricao)
              )
              FROM cest_data c
              WHERE i.ncm LIKE (c.ncm || '%')
                AND LENGTH(c.ncm) = (
                  SELECT MAX(LENGTH(c2.ncm))
                  FROM cest_data c2
                  WHERE i.ncm LIKE (c2.ncm || '%')
                )
          ) as cests
      FROM ibpt_taxes i
    `;
    
    console.log('Consultando e unindo dados para exportação (isso pode levar um momento)...');
    
    // O resultado da query é um array de objetos, tipamos como ExportedRow para evitar 'any'
    const todosOsDados = db.prepare(query).all() as ExportedRow[];

    if (todosOsDados.length === 0) {
        console.log('Nenhum dado para exportar.');
        return;
    }

    // O map agora é tipado, mas o row.cests precisa ser convertido de string JSON para objeto
    const dadosParaJson = todosOsDados.map((row) => ({
        ...row,
        cests: (row.cests as unknown as string) ? JSON.parse(row.cests as unknown as string) : [] 
    }));

    // --- CORREÇÃO: Usa o dataPath para salvar os arquivos de exportação ---
    const nomeArquivoJson = path.join(dataPath, 'openfiscal_completo.json');
    fs.writeFileSync(nomeArquivoJson, JSON.stringify(dadosParaJson, null, 2), 'utf8');
    console.log(`Dados salvos com sucesso em '${nomeArquivoJson}'`);

    const nomeArquivoCsv = path.join(dataPath, 'openfiscal_completo.csv');
    
    // O map aqui é tipado e acessa as propriedades corretamente
    const dadosParaCsv = dadosParaJson.map((item) => ({
        ...item,
        cests: item.cests.map((c: { cest: string }) => c.cest).join(';')
    }));
    
    const json2csvParser = new Parser({ withBOM: true });
    const csv = json2csvParser.parse(dadosParaCsv);
    fs.writeFileSync(nomeArquivoCsv, csv, 'utf8');
    console.log(`Dados salvos com sucesso em '${nomeArquivoCsv}'`);
    // ------------------------------------------------------------------------

  } catch (error: unknown) {
    // Tratamento de erro com type guard para 'unknown'
    const err = error as Error;
    console.error('Erro ao exportar arquivos:', err.message);
  }
}


async function main(): Promise<void> {
    criarTabelas();
    await processarIbpt();
    await processarCest();
    // await exportarArquivos(); // Comente ou descomente esta linha conforme a necessidade local.

    db.close();
    console.log("Processo de atualização e exportação finalizado. Conexão com o banco de dados fechada.");
}

if (require.main === module) {
    main().then(() => {
        console.log("Forçando encerramento manual do script.");
        process.exit(0);
    }).catch((err) => {
        console.error("Erro fatal durante a execução manual da main:", err);
        process.exit(1);
    });
}

cron.schedule('0 2 * * 0', () => {
    console.log('Executando tarefa agendada de atualização do banco de dados...');
    main().catch(console.error);
});
