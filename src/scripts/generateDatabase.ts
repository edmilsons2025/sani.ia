const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const csv = require('csvtojson');
const Database = require('better-sqlite3');
const https = require('https');
const { Parser } = require('json2csv');

// --- Definições de Tipos (Interfaces) ---

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

interface CestItem {
  CEST: string;
  NCM_SH: string[];
  Descricao: string;
}

interface Metadata {
    etag?: string;
    lastModified?: string;
    lastUpdate?: string;
}
// ----------------------------------------

// --- NOVO: Define a pasta onde os dados devem ser salvos ---
const dataPath = path.join(__dirname, '..', 'data'); 
// O __dirname aponta para 'src/scripts', então subimos um nível (..) e entramos em 'data'.

// Cria o diretório 'src/data' se ele não existir
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
    console.log(`Diretório de dados criado em: ${dataPath}`);
}

// Junta o caminho da pasta com o nome do arquivo
const dbPath = path.join(dataPath, 'openfiscal.db');
const metadataFilePath = path.join(dataPath, 'cest_metadata.json');


const db = new Database(dbPath); // Usa o caminho completo para criar/acessar o DB
db.pragma('journal_mode = WAL');


function criarTabelas() {
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

async function processarIbpt() {
  console.log('Iniciando processamento dos dados do IBPT...');
  const svnUrl = 'http://svn.code.sf.net/p/acbr/code/trunk2/Exemplos/ACBrTCP/ACBrIBPTax/tabela/';
  
  db.exec('DELETE FROM ibpt_taxes;');
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO ibpt_taxes (ncm, uf, ex, tipo, descricao, aliqNacional, aliqEstadual, aliqMunicipal, aliqImportado, vigenciaInicio, vigenciaFim, chave, versao, fonte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Tipagem adicionada aqui
  const inserirMuitos = db.transaction((linhas: IbptRow[], uf: string) => {
    for (const linha of linhas) {
      const ncmLimpo = (linha.codigo || '').replace(/\./g, '');
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
    
    // Tipagem adicionada aqui
    const csvFiles: string[] = [];
    
    // Tipagem adicionada aqui
    $('a[href$=".csv"]').each((i: number, link: any) => {
      csvFiles.push($(link).attr('href'));
    });

    // csvFiles agora é string[]
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
      
      // Especificamos que o JSON resultante será um array de IbptRow
      const jsonArray: IbptRow[] = await csv({
        delimiter: ';',
        headers: ['codigo', 'ex', 'tipo', 'descricao', 'nacionalfederal', 'importadosfederal', 'estadual', 'municipal', 'vigenciainicio', 'vigenciafim', 'chave', 'versao', 'fonte']
      }).fromStream(csvStream);
      
      inserirMuitos(jsonArray, ufDoArquivo);
    }
    console.log('Processamento do IBPT concluído.');

    // << CORREÇÃO >>: Reconstrói o índice FTS5 para garantir a sincronização.
    // Este comando é a forma mais segura de garantir que o índice de busca
    // esteja perfeitamente alinhado com a tabela de dados após a importação em massa.
    console.log('Reconstruindo índice de busca semântica...');
    db.exec(`INSERT INTO ibpt_search(ibpt_search) VALUES('rebuild');`);
    console.log('Índice de busca reconstruído com sucesso.');

  } catch (error) {
    // Tratamento de erro com type guard para 'unknown'
    console.error('Erro ao processar dados do IBPT:', error instanceof Error ? error.message : 'Erro desconhecido');
  }
}

async function processarCest() {
    console.log('Iniciando verificação de atualização do CEST...');
    const url = "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18";
    const agent = new https.Agent({ rejectUnauthorized: false });

    // Tipagem adicionada aqui
    let metadadosLocais: Metadata = {};
    if (fs.existsSync(metadataFilePath)) {
        // Tipagem para garantir que o resultado é tratado como Metadata
        metadadosLocais = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8')) as Metadata;
    }

    try {
        const headResponse = await axios.head(url, { httpsAgent: agent });
        const etagRemoto: string | undefined = headResponse.headers['etag'];
        const lastModifiedRemoto: string | undefined = headResponse.headers['last-modified'];

        // Acesso seguro às propriedades após a tipagem de metadadosLocais
        if (etagRemoto && etagRemoto === metadadosLocais.etag) {
            console.log('Tabela CEST não foi modificada (ETag idêntico). Pulando atualização.');
            return;
        }
        if (lastModifiedRemoto && lastModifiedRemoto === metadadosLocais.lastModified) {
            console.log('Tabela CEST não foi modificada (Last-Modified idêntico). Pulando atualização.');
            return;
        }

        console.log('Nova versão da tabela CEST encontrada. Iniciando download e processamento completo...');

        const response = await axios.get(url, { httpsAgent: agent });
        const $ = cheerio.load(response.data);
        
        // Tipagem adicionada aqui
        const todosOsItens: CestItem[] = [];

        // Tipagem adicionada aqui
        $('p.A6-1Subtitulo').each((index: number, element: any) => {
            const tituloAnexo = $(element).text().trim();
            if (tituloAnexo.startsWith('ANEXO ') && tituloAnexo.length < 15) {
                const tabela = $(element).nextAll('table').first();
                if (tabela.length) {
                    // Tipagem adicionada aqui
                    $(tabela).find('tbody tr').each((i: number, linha: any) => {
                        if (i === 0) return;
                        const celulas = $(linha).find('td');
                        if (celulas.length >= 4) {
                            const ncmString = $(celulas[2]).text().trim();
                            
                            // Tipagem adicionada aqui
                            const ncmArray: string[] = ncmString.split(/\s+/).filter((ncm: string) => ncm.length > 0);
                            
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
            
            // Tipagem adicionada aqui
            const inserirMuitosCest = db.transaction((itens: CestItem[]) => {
                for (const item of itens) {
                    const cestLimpo = (item.CEST || '').replace(/\./g, '');
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

            const novosMetadados: Metadata = {
                etag: etagRemoto,
                lastModified: lastModifiedRemoto,
                lastUpdate: new Date().toISOString()
            };
            fs.writeFileSync(metadataFilePath, JSON.stringify(novosMetadados, null, 2), 'utf8');
            console.log('Metadados de controle do CEST foram atualizados.');
        }

    } catch (error) {
        // Tratamento de erro com type guard para 'unknown'
        console.error('Erro ao processar dados do CEST:', error instanceof Error ? error.message : 'Erro desconhecido');
    }
}

async function exportarArquivos() {
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
    
    // O resultado da query é um array de objetos genéricos, mas vamos tipar o map.
    const todosOsDados: any[] = db.prepare(query).all();

    if (todosOsDados.length === 0) {
        console.log('Nenhum dado para exportar.');
        return;
    }

    // Tipagem adicionada aqui
    const dadosParaJson = todosOsDados.map((row: any) => ({
        ...row,
        cests: row.cests ? JSON.parse(row.cests) : [] 
    }));

    // --- CORREÇÃO: Usa o dataPath para salvar os arquivos de exportação ---
    const nomeArquivoJson = path.join(dataPath, 'openfiscal_completo.json');
    fs.writeFileSync(nomeArquivoJson, JSON.stringify(dadosParaJson, null, 2), 'utf8');
    console.log(`Dados salvos com sucesso em '${nomeArquivoJson}'`);

    const nomeArquivoCsv = path.join(dataPath, 'openfiscal_completo.csv');
    // Tipagem adicionada aqui
    const dadosParaCsv = dadosParaJson.map((item: any) => ({
        ...item,
        // Tipagem adicionada aqui
        cests: item.cests.map((c: { cest: string }) => c.cest).join(';')
    }));
    const json2csvParser = new Parser({ withBOM: true });
    const csv = json2csvParser.parse(dadosParaCsv);
    fs.writeFileSync(nomeArquivoCsv, csv, 'utf8');
    console.log(`Dados salvos com sucesso em '${nomeArquivoCsv}'`);
    // ------------------------------------------------------------------------

  } catch (error) {
    // Tratamento de erro com type guard para 'unknown'
    console.error('Erro ao exportar arquivos:', error instanceof Error ? error.message : 'Erro desconhecido');
  }
}


async function main() {
    criarTabelas();
    await processarIbpt();
    await processarCest();
    //await exportarArquivos(); // Comentei para não exportar a cada execução, se não for necessário

    db.close();
    console.log("Processo de atualização e exportação finalizado. Conexão com o banco de dados fechada.");
}

if (require.main === module) {
    // --- CORREÇÃO: Força o encerramento do processo após a conclusão da main()
    // Isso anula o timer criado pelo node-cron, permitindo que o ts-node termine.
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
