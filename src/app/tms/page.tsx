'use client'; 

import { useState } from 'react';
import { useTestData } from '@/hooks/useTestData';
import LotesPage from '@/components/tms/LotesPage';
import TestesPage from '@/components/tms/TestesPage';
import RelatoriosPage from '@/components/tms/RelatoriosPage';
import ConfiguracoesPage from '@/components/tms/ConfiguracoesPage';
import { NavButton } from '@/components/ui/NavButton'; // Supondo que você crie um componente de botão de navegação

export default function FerramentaDeTestePage() {
  const [activeView, setActiveView] = useState('lotes');
  const testData = useTestData();

  const renderView = () => {
    switch (activeView) {
      case 'lotes':
        return <LotesPage testData={testData} setActiveView={setActiveView} />;
      case 'testes':
        return <TestesPage testData={testData} setActiveView={setActiveView} />;
      case 'relatorios':
        return <RelatoriosPage testData={{ allTests: testData.allTests, testClasses: testData.testClasses }} />;
      case 'configuracoes':
        return <ConfiguracoesPage testData={testData} />;
      default:
        return <LotesPage testData={testData} setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="w-full p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800">Ferramenta de Teste de Equipamentos</h1>
        <p className="text-gray-600 mb-6">Gerencie lotes, execute testes e analise os resultados.</p>

        <nav className="flex justify-start gap-2 border-b border-gray-200 pb-4 mb-6">
            <NavButton currentView={activeView} view="lotes" setView={setActiveView} label="Lotes" />
            <NavButton currentView={activeView} view="testes" setView={setActiveView} label="Testes" />
            <NavButton currentView={activeView} view="relatorios" setView={setActiveView} label="Relatórios" />
            <NavButton currentView={activeView} view="configuracoes" setView={setActiveView} label="Configurações" />
        </nav>
        <div className="bg-white p-6 rounded-lg shadow-md">
            {renderView()}
        </div>
    </div>
  );
}
