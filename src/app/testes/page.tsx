'use client';

// --- TIPAGEM DOS DADOS ---
interface Equipamento {
  lote_id: string;
}

interface TestResult {
  equipamento: Equipamento;
}

// Tipagem para as props
interface LotesPageProps {
  testData: {
    allTests: TestResult[];
    createNewLote: () => void;
    setActiveLoteId: (loteId: string) => void;
  };
}

export default function LotesPage({ testData }: LotesPageProps) {
  const { allTests, createNewLote, setActiveLoteId } = testData;

  const lotes = [...new Set(allTests.map((t) => t.equipamento.lote_id))].sort().reverse();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gerenciar Lotes de Teste</h2>
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Criar Novo Lote</h3>
        <button
          onClick={createNewLote}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700"
        >
          Criar Novo Lote com ID Automático
        </button>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Lotes Existentes</h3>
        {lotes.length > 0 ? (
          <ul className="space-y-2">
            {lotes.map((loteId) => (
              <li
                key={loteId}
                className="flex justify-between items-center p-4 bg-white border rounded-md"
              >
                <span className="font-medium text-gray-800">{loteId}</span>
                <button
                  onClick={() => setActiveLoteId(loteId)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700"
                >
                  Selecionar Lote
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Nenhum lote criado ainda.</p>
        )}
      </div>
    </div>
  );
}
