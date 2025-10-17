'use client';

import React from 'react';
import { ClassificationItem } from './ClassificationItem';
import { NcmResultFromApi } from '@/services/NcmService'; // Importe os tipos necessários

/**
 * Define a estrutura dos resultados do processamento que este componente espera.
 */
interface ProcessingResult {
  rowIndex: number;
  query: string;
  ncmResults: NcmResultFromApi[];
}

/**
 * Define as propriedades que o componente ProductClassifier receberá da página principal.
 */
interface ProductClassifierProps {
  processingResults: ProcessingResult[];
  userSelections: Record<number, string>;
  onNcmSelected: (rowIndex: number, ncm: string) => void;
  onSuggestionSubmitted: (originalQuery: string, ncm: NcmResultFromApi) => void;
}

/**
 * Componente responsável por renderizar a lista de itens para classificação.
 * Ele recebe a lista completa de resultados e as funções de controle da página principal
 * e as distribui para cada componente ClassificationItem individual.
 */
export const ProductClassifier: React.FC<ProductClassifierProps> = ({
  processingResults,
  userSelections,
  onNcmSelected,
  onSuggestionSubmitted,
}) => {
  return (
    <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 border-t border-b py-4">
      {processingResults.map(result => (
        <ClassificationItem
          key={result.rowIndex}
          productName={result.query}
          initialResults={result.ncmResults}
          currentSelection={userSelections[result.rowIndex] || null}
          // Adiciona a anotação de tipo aqui para garantir a segurança
          onNcmSelected={(ncm: string) => onNcmSelected(result.rowIndex, ncm)}
          onSuggestionSubmitted={onSuggestionSubmitted}
        />
      ))}
    </ul>
  );
};