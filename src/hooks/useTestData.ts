'use client';

import { useState, useCallback } from 'react';
import { generateNewLoteId } from '@/lib/testUtils';

// Hook genérico para gerenciar estado no localStorage
const useLocalStorage = (key: string, initialValue: any) => {
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

  const setValue = (value: any) => {
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
  const [allTests, setAllTests] = useLocalStorage('allTests', []);
  const [activeLoteId, setActiveLoteId] = useLocalStorage('activeLoteId', null);
  const [testClasses, setTestClasses] = useLocalStorage('testClasses', {
    'NVR/XVR': [
        { id: 'alimentacao', name: 'Alimentação', desc: 'Verificar se o equipamento liga com a fonte padrão.' },
        { id: 'video', name: 'Saída de Vídeo (HDMI/VGA)', desc: 'Testar a exibição de imagem em um monitor.' },
        { id: 'rede', name: 'Conexão de Rede (LAN)', desc: 'Verificar se o LED da porta acende e se o IP é atribuído.' },
    ]
  });

  const createNewLote = useCallback(() => {
    const newLoteId = generateNewLoteId(allTests);
    setActiveLoteId(newLoteId);
    return newLoteId;
  }, [allTests, setActiveLoteId]);

  const addTestResult = useCallback((testResult: any) => {
    setAllTests((prevTests: any[]) => [...prevTests, testResult]);
  }, [setAllTests]);
  
  const addTestClass = useCallback((className: string) => {
    if (className && !testClasses[className]) {
      setTestClasses((prev: object) => ({...prev, [className]: [] }));
    }
  }, [testClasses, setTestClasses]);

  // Funções para manipular classes e testes
  const addTestToClass = useCallback((className: string, test: {name: string, desc: string}) => {
     const testId = test.name.toLowerCase().replace(/[^a-z0-9]/g, '');
     setTestClasses((prev: any) => {
        const newClasses = {...prev};
        if (newClasses[className] && !newClasses[className].some((t: any) => t.id === testId)) {
            newClasses[className].push({ ...test, id: testId });
        }
        return newClasses;
     });
  }, [setTestClasses]);

  const removeTestFromClass = useCallback((className: string, testIndex: number) => {
     setTestClasses((prev: any) => {
        const newClasses = {...prev};
        if (newClasses[className]) {
            newClasses[className].splice(testIndex, 1);
        }
        return newClasses;
     });
  }, [setTestClasses]);
  
  const removeClass = useCallback((className: string) => {
    setTestClasses((prev: any) => {
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
