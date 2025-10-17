'use client';

import { useState, useCallback } from 'react';
import { generateNewLoteId, TestResult, TestItem } from '@/lib/testUtils';

// Hook genérico para gerenciar estado no localStorage
const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Hook principal para gerenciar os dados da ferramenta de teste
export function useTestData() {
  const [allTests, setAllTests] = useLocalStorage<TestResult[]>('allTests', []);
  const [activeLoteId, setActiveLoteId] = useLocalStorage<string | null>('activeLoteId', null);
  const [testClasses, setTestClasses] = useLocalStorage<Record<string, TestItem[]>>('testClasses', {
    'NVR/XVR': [
        { id: 'alimentacao', name: 'Alimentação', desc: 'Verificar se o equipamento liga com a fonte padrão.' } as TestItem,
        { id: 'video', name: 'Saída de Vídeo (HDMI/VGA)', desc: 'Testar a exibição de imagem em um monitor.' } as TestItem,
        { id: 'rede', name: 'Conexão de Rede (LAN)', desc: 'Verificar se o LED da porta acende e se o IP é atribuído.' } as TestItem,
    ]
  });

  const createNewLote = useCallback(() => {
    const newLoteId = generateNewLoteId(allTests);
    setActiveLoteId(newLoteId);
    return newLoteId;
  }, [allTests, setActiveLoteId]);

  const addTestResult = useCallback((testResult: TestResult) => {
    setAllTests((prevTests: TestResult[]) => [...prevTests, testResult]);
  }, [setAllTests]);
  
  const addTestClass = useCallback((className: string) => {
    if (className && !testClasses[className]) {
      setTestClasses((prev: Record<string, TestItem[]>) => ({...prev, [className]: [] }));
    }
  }, [testClasses, setTestClasses]);

  // Funções para manipular classes e testes
  const addTestToClass = useCallback((className: string, test: Omit<TestItem, 'id'>) => {
     const testId = test.name.toLowerCase().replace(/[^a-z0-9]/g, '');
     setTestClasses((prev: Record<string, TestItem[]>) => {
        const newClasses = {...prev};
        if (newClasses[className] && !newClasses[className].some((t: TestItem) => t.id === testId)) {
            newClasses[className].push({ ...test, id: testId });
        }
        return newClasses;
     });
  }, [setTestClasses]);

  const removeTestFromClass = useCallback((className: string, testIndex: number) => { // Fix: testIndex should be number
     setTestClasses((prev: Record<string, TestItem[]>) => {
        const newClasses = {...prev};
        if (newClasses[className]) {
            newClasses[className].splice(testIndex, 1);
        }
        return newClasses;
     });
  }, [setTestClasses]);
  
  const removeClass = useCallback((className: string) => { // Fix: className should be string
    setTestClasses((prev: Record<string, TestItem[]>) => {
       const newClasses = {...prev};
       delete newClasses[className];
       return newClasses;
    });
  }, [setTestClasses]);

  return {
    allTests,
    activeLoteId,
    testClasses,
    createNewLote,
    setActiveLoteId,
    addTestResult,
    addTestClass,
    addTestToClass,
    removeTestFromClass,
    removeClass,
  };
}
