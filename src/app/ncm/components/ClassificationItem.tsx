'use client';

import React, { useState } from 'react';
import { NcmResultFromApi, NcmService } from '@/services/NcmService';

interface ClassificationItemProps {
  productName: string;
  initialResults: NcmResultFromApi[];
  currentSelection: string | null;
  onNcmSelected: (ncm: string) => void;
  onSuggestionSubmitted: (originalQuery: string, ncm: NcmResultFromApi) => void;
}

/**
 * Componente para revisar e classificar um único produto da planilha.
 */
export const ClassificationItem: React.FC<ClassificationItemProps> = ({
  productName,
  initialResults,
  currentSelection,
  onNcmSelected,
  onSuggestionSubmitted,
}) => {
  const [results, setResults] = useState<NcmResultFromApi[]>(initialResults);
  const [selectedValue, setSelectedValue] = useState<string | null>(currentSelection);
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [manualResults, setManualResults] = useState<NcmResultFromApi[] | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  const handleSelectionChange = (value: string) => {
    setSelectedValue(value);
    if (value !== 'manual') {
      onNcmSelected(value);
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearchTerm.trim()) return;
    setManualLoading(true);
    try {
      const ncmService = NcmService.getInstance();
      const data = await ncmService.search(manualSearchTerm);
      setManualResults(data);
    } catch (err) {
      console.error(err);
      setManualResults([]);
    } finally {
      setManualLoading(false);
    }
  };

  const handleFinalManualSelection = (ncm: NcmResultFromApi) => {
    onSuggestionSubmitted(productName, ncm);
    if (!results.some(r => r.ncm === ncm.ncm)) {
      setResults(prev => [...prev, { ...ncm, source: 'user_selection' }]);
    }
    setSelectedValue(ncm.ncm);
    onNcmSelected(ncm.ncm);
    setManualResults(null);
    setManualSearchTerm('');
  };

  return (
    <li className={`p-4 rounded-lg border ${selectedValue && selectedValue !== 'manual' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      <p className="font-semibold text-gray-800">Produto: <span className="font-normal text-blue-700">{productName}</span></p>
      
      {results.length > 0 ? (
        <div role="radiogroup" className="mt-2 space-y-2">
          {results.map(ncmRes => (
            <label key={ncmRes.ncm} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
              <input type="radio" name={`ncm-select-${productName}`} value={ncmRes.ncm} checked={selectedValue === ncmRes.ncm} onChange={() => handleSelectionChange(ncmRes.ncm)} className="h-4 w-4 text-blue-600" />
              <div>
                <code className="font-bold text-gray-900">{ncmRes.ncm}</code>
                <p className="text-sm text-gray-600">{ncmRes.descricao}</p>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-md">
            {productName.includes('Valor Nulo/Inválido') ? 'Valor da coluna de origem inválido/vazio.' : 'Nenhum NCM encontrado para este item.'}
        </p>
      )}

      <div className="mt-2">
        <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
          <input type="radio" name={`ncm-select-${productName}`} value="manual" checked={selectedValue === 'manual'} onChange={() => handleSelectionChange('manual')} className="h-4 w-4 text-blue-600" />
          <p className="font-medium text-gray-700">Nenhum. Buscar manualmente</p>
        </label>
      </div>

      {selectedValue === 'manual' && (
        <div className="mt-3 ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <input type="text" value={manualSearchTerm} onChange={e => setManualSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualSearch()} placeholder="Digite um termo mais específico..." className="flex-grow p-2 border border-gray-300 rounded-md" />
            <button onClick={handleManualSearch} disabled={manualLoading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md disabled:bg-gray-400">
              {manualLoading ? '...' : 'Buscar'}
            </button>
          </div>

          {manualResults && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {manualResults.length > 0 ? (
                manualResults.map(item => (
                  <div key={item.ncm} onClick={() => handleFinalManualSelection(item)} className="p-3 bg-white border rounded-md cursor-pointer hover:bg-blue-100">
                    <code className="font-bold">{item.ncm}</code>
                    <p className="text-sm">{item.descricao}</p>
                  </div>
                ))
              ) : <p className="text-gray-500">Nenhum resultado encontrado.</p>}
            </div>
          )}
        </div>
      )}
    </li>
  );
};