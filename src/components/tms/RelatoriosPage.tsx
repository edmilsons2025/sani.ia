'use client';
// Este componente precisará da biblioteca react-chartjs-2
// Rode: npm install chart.js react-chartjs-2

import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { exportToCsv } from '@/lib/testUtils';

// Registrar os componentes do Chart.js
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- TIPAGEM DOS DADOS ---
interface Equipamento {
  lote_id: string;
  tipo_equipamento: string;
  sku: string;
  barebone: string;
  numero_serie: string;
}

interface TestItem {
    name: string;
    status: 'Aprovado' | 'Reprovado';
    observacao: string;
}

interface TestResult {
  equipamento: Equipamento;
  timestamp: string; // ISO string
  testes: { [key: string]: TestItem };
  observacoes_gerais: string;
}

interface RelatoriosPageProps {
  testData: {
    allTests: TestResult[];
    testClasses: any;
  };
}

export default function RelatoriosPage({ testData }: RelatoriosPageProps) {
  const { allTests, testClasses } = testData;
  const [filters, setFilters] = useState({
    start: '',
    end: '',
    lote: '',
    tipo: '',
    barebone: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const filteredData = useMemo(() => {
    return allTests.filter((test: TestResult) => {
        const start = filters.start ? new Date(filters.start).setHours(0,0,0,0) : null;
        const end = filters.end ? new Date(filters.end).setHours(23,59,59,999) : null;
        const testDate = new Date(test.timestamp).getTime();
        return (!start || testDate >= start) &&
               (!end || testDate <= end) &&
               (!filters.lote || test.equipamento.lote_id === filters.lote) &&
               (!filters.tipo || test.equipamento.tipo_equipamento === filters.tipo) &&
               (!filters.barebone || test.equipamento.barebone === filters.barebone);
    });
  }, [allTests, filters]);

  const failureCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredData.forEach((test: TestResult) => {
      Object.values(test.testes).forEach((item: TestItem) => {
        if (item.status === 'Reprovado') {
          counts[item.name] = (counts[item.name] || 0) + 1;
        }
      });
    });
    return counts;
  }, [filteredData]);

  const chartData = {
    labels: Object.keys(failureCounts),
    datasets: [{
      label: 'Número de Reprovações',
      data: Object.values(failureCounts),
      backgroundColor: 'rgba(239, 68, 68, 0.6)',
      borderColor: 'rgba(220, 38, 38, 1)',
      borderWidth: 1
    }]
  };
  
  const uniqueLotes = [...new Set(allTests.map((t: TestResult) => t.equipamento.lote_id))];
  const uniqueBarebones = [...new Set(allTests.map((t: TestResult) => t.equipamento.barebone))];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Relatórios e Histórico</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-md mb-6">
        <div>
            <label className="text-sm font-semibold">Data Início</label>
            <input type="date" name="start" value={filters.start} onChange={handleFilterChange} className="w-full p-2 border rounded-md" />
        </div>
        <div>
            <label className="text-sm font-semibold">Data Fim</label>
            <input type="date" name="end" value={filters.end} onChange={handleFilterChange} className="w-full p-2 border rounded-md" />
        </div>
        <div>
            <label className="text-sm font-semibold">Lote</label>
            <select name="lote" value={filters.lote} onChange={handleFilterChange} className="w-full p-2 border rounded-md">
                <option value="">Todos</option>
                {uniqueLotes.map(lote => <option key={lote} value={lote}>{lote}</option>)}
            </select>
        </div>
        <div>
            <label className="text-sm font-semibold">Tipo</label>
            <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="w-full p-2 border rounded-md">
                <option value="">Todos</option>
                {Object.keys(testClasses).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        <div>
            <label className="text-sm font-semibold">Barebone</label>
            <select name="barebone" value={filters.barebone} onChange={handleFilterChange} className="w-full p-2 border rounded-md">
                <option value="">Todos</option>
                {uniqueBarebones.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
        </div>
      </div>
       <div className="mb-6">
            <button onClick={() => exportToCsv(filteredData)} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
                Exportar para CSV (Filtrado)
            </button>
       </div>
       <div className="mb-8 p-4 border rounded-md">
         <h3 className="text-lg font-semibold mb-2 text-gray-700">Gráfico de Falhas</h3>
         <Bar data={chartData} options={{ scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
       </div>
       <div>
         <h3 className="text-lg font-semibold mb-2 text-gray-700">Relatório Detalhado</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2">Data</th>
                        <th className="p-2">Lote</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">S/N</th>
                        <th className="p-2">Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData.map((test: TestResult) => (
                        <tr key={test.equipamento.numero_serie} className="border-b">
                            <td className="p-2">{new Date(test.timestamp).toLocaleString('pt-BR')}</td>
                            <td className="p-2">{test.equipamento.lote_id}</td>
                            <td className="p-2">{test.equipamento.tipo_equipamento}</td>
                            <td className="p-2">{test.equipamento.numero_serie}</td>
                            <td className={`p-2 font-bold ${Object.values(test.testes).some((i: TestItem) => i.status === 'Reprovado') ? 'text-red-600' : 'text-green-600'}`}>
                                {Object.values(test.testes).some((i: TestItem) => i.status === 'Reprovado') ? 'Reprovado' : 'Aprovado'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
       </div>
    </div>
  );
}
