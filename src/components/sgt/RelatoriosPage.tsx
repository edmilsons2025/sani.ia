'use client';

import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { exportToCsv } from '@/lib/testUtils';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TestResultItem {
    test_item_name: string;
    status: 'Aprovado' | 'Reprovado';
    observation: string;
}

export interface TestResult {
  id: number;
  timestamp: string;
  lote_id: number;
  equipment_type: string;
  equipment_sku: string;
  equipment_barebone: string;
  equipment_serial: string;
  general_observations: string;
  test_result_items: TestResultItem[];
}

interface RelatoriosPageProps {
  testData: {
    allTests: TestResult[];
    testClasses: any[];
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
               (!filters.lote || test.lote_id.toString() === filters.lote) &&
               (!filters.tipo || test.equipment_type === filters.tipo) &&
               (!filters.barebone || test.equipment_barebone === filters.barebone);
    });
  }, [allTests, filters]);

  const failureCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredData.forEach((test: TestResult) => {
      test.test_result_items.forEach((item: TestResultItem) => {
        if (item.status === 'Reprovado') {
          counts[item.test_item_name] = (counts[item.test_item_name] || 0) + 1;
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
      backgroundColor: 'rgba(168, 85, 247, 0.6)', // Purple
      borderColor: 'rgba(147, 51, 234, 1)', // Darker Purple
      borderWidth: 1
    }]
  };
  
  const uniqueLotes = [...new Set(allTests.map((t: TestResult) => t.lote_id))];
  const uniqueBarebones = [...new Set(allTests.map((t: TestResult) => t.equipment_barebone))];

  return (
    <div className="bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Relatórios e Histórico</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-700 rounded-md mb-6">
        <div>
            <label className="text-sm font-semibold text-gray-300">Data Início</label>
            <input type="date" name="start" value={filters.start} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500" />
        </div>
        <div>
            <label className="text-sm font-semibold text-gray-300">Data Fim</label>
            <input type="date" name="end" value={filters.end} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500" />
        </div>
        <div>
            <label className="text-sm font-semibold text-gray-300">Lote</label>
            <select name="lote" value={filters.lote} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500">
                <option value="">Todos</option>
                {uniqueLotes.map(lote => <option key={lote} value={lote}>{lote}</option>)}
            </select>
        </div>
        <div>
            <label className="text-sm font-semibold text-gray-300">Tipo</label>
            <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500">
                <option value="">Todos</option>
                {testClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
        </div>
        <div>
            <label className="text-sm font-semibold text-gray-300">Barebone</label>
            <select name="barebone" value={filters.barebone} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500">
                <option value="">Todos</option>
                {uniqueBarebones.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
        </div>
      </div>
       <div className="mb-6">
            <button onClick={() => exportToCsv(filteredData as any)} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700">
                Exportar para CSV (Filtrado)
            </button>
       </div>
       <div className="mb-8 p-4 border rounded-md border-gray-700">
         <h3 className="text-lg font-semibold mb-2 text-gray-300">Gráfico de Falhas</h3>
         <Bar data={chartData} options={{ scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
       </div>
       <div>
         <h3 className="text-lg font-semibold mb-2 text-gray-300">Relatório Detalhado</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-700">
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
                        <tr key={test.id} className="border-b border-gray-700">
                            <td className="p-2">{new Date(test.timestamp).toLocaleString('pt-BR')}</td>
                            <td className="p-2">{test.lote_id}</td>
                            <td className="p-2">{test.equipment_type}</td>
                            <td className="p-2">{test.equipment_serial}</td>
                            <td className={`p-2 font-bold ${test.test_result_items.some((i: TestResultItem) => i.status === 'Reprovado') ? 'text-red-400' : 'text-green-400'}`}>
                                {test.test_result_items.some((i: TestResultItem) => i.status === 'Reprovado') ? 'Reprovado' : 'Aprovado'}
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
