// SGT - Sistema de Gerenciamento de Testes

'use client'; 

import { useState, useEffect } from 'react';
import LotesPage from '@/components/sgt/LotesPage';
import TestesPage from '@/components/sgt/TestesPage';
import RelatoriosPage from '@/components/sgt/RelatoriosPage';
import ConfiguracoesPage from '@/components/sgt/ConfiguracoesPage';
import { NavButton } from '@/components/ui/NavButton';
import * as sgtService from '@/services/sgtService';

// --- DEFINIÇÃO DAS INTERFACES ---

interface Lote {
  id: string;
  name: string;
  status: string;
}

interface TestItem {
  id: string;
  name: string;
  description: string;
}

interface TestClass {
  id: string;
  name: string;
  test_items: TestItem[];
}

interface TestResultItem {
  test_item_name: string;
  status: 'Aprovado' | 'Reprovado';
  observation: string;
}

interface TestResult {
  id: string;
  timestamp: string;
  lote_id: string;
  equipment_type: string;
  equipment_sku: string;
  equipment_barebone: string;
  equipment_serial: string;
  general_observations: string;
  test_result_items: TestResultItem[];
}

// --- FIM DAS INTERFACES ---

export default function FerramentaDeTestePage() {
  const [activeView, setActiveView] = useState('lotes');
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [testClasses, setTestClasses] = useState<TestClass[]>([]);
  const [allTests, setAllTests] = useState<TestResult[]>([]);
  const [activeLoteId, setActiveLoteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [lotesData, testClassesData, allTestsData] = await Promise.all([
        sgtService.getLotes(),
        sgtService.getTestClasses(),
        sgtService.getTestResults(),
      ]);
      setLotes(lotesData);
      setTestClasses(testClassesData);
      setAllTests(allTestsData);
    };
    fetchData();
  }, []);

  const createNewLote = async (loteName: string) => {
    try {
      const newLote = await sgtService.createLote(loteName);
      if (!newLote) {
        throw new Error("A API não retornou dados para o novo lote.");
      }
      setLotes(prevLotes => [...prevLotes, newLote]); 
      return newLote; 
    } catch (error) {
      console.error("Erro em createNewLote (page.tsx):", error);
      throw error; 
    }
  };

  const deleteLote = async (loteId: string) => {
    await sgtService.deleteLote(loteId); 
    setLotes(prevLotes => prevLotes.filter(lote => lote.id !== loteId));
  };

  const addTestClass = async (className: string) => {
    const newTestClass = await sgtService.createTestClass(className);
    setTestClasses(prevClasses => [...prevClasses, newTestClass]);
  };

  const addTestToClass = async (className: string, testItem: { name: string; description: string }) => {
    const testClass = testClasses.find(tc => tc.name === className);
    if (testClass) {
      const newTestItem = await sgtService.createTestItem(testClass.id, testItem);
      const testClassesData = await sgtService.getTestClasses();
      setTestClasses(testClassesData);
    }
  };

  const addTestResult = async (testResult: any) => {
  if (activeLoteId) {
    const newTestResult = await sgtService.createTestResult(activeLoteId, testResult);
    setAllTests(prevTests => [...prevTests, newTestResult]);
  }
};

  const updateLoteStatus = async (loteId: number, status: string) => {
    await sgtService.updateLoteStatus(loteId, status);
    const lotesData = await sgtService.getLotes();
    setLotes(lotesData);
  };

  const testData = {
    allTests,
    lotes,
    testClasses,
    activeLoteId,
    createNewLote,
    setActiveLoteId,
    addTestClass,
    addTestToClass,
    addTestResult,
    updateLoteStatus,
    deleteLote,
    removeTestFromClass: async (className: string, index: number) => {
      const testClass = testClasses.find(tc => tc.name === className);
      if (testClass) {
        const testItem = testClass.test_items[index];
        if (testItem) {
          await sgtService.deleteTestItem(testItem.id);
          const testClassesData = await sgtService.getTestClasses();
          setTestClasses(testClassesData);
        }
      }
    },
    removeClass: async (className: string) => {
      const testClass = testClasses.find(tc => tc.name === className);
      if (testClass) {
        await sgtService.deleteTestClass(testClass.id);
        const testClassesData = await sgtService.getTestClasses();
        setTestClasses(testClassesData);
      }
    },
  };

  const renderView = () => {
    switch (activeView) {
      case 'lotes':
        return <LotesPage testData={testData} setActiveView={setActiveView} />;
      case 'testes':
        return <TestesPage testData={testData} setActiveView={setActiveView} />;
      case 'relatorios':
        return <RelatoriosPage testData={testData} />;
      case 'configuracoes':
        return <ConfiguracoesPage testData={testData} />;
      default:
        return <LotesPage testData={testData} setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="w-full bg-gray-900 text-white p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-white">Sistema de Gerenciamento de Testes</h1>
        <p className="text-gray-300 mb-6">Gerencie lotes, execute testes e analise os resultados.</p>

        <nav className="flex justify-start gap-2 border-b border-gray-700 pb-4 mb-6">
            <NavButton currentView={activeView} view="lotes" setView={setActiveView} label="Lotes" />
            {/* <NavButton currentView={activeView} view="testes" setView={setActiveView} label="Testes" /> */}
            <NavButton currentView={activeView} view="relatorios" setView={setActiveView} label="Relatórios" />
            <NavButton currentView={activeView} view="configuracoes" setView={setActiveView} label="Configurações" />
        </nav>
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            {renderView()}
        </div>
    </div>
  );
}
