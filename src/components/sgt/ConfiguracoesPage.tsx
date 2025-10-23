'use client';

import { useState } from 'react';

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

interface ConfiguracoesPageProps {
  testData: {
    testClasses: TestClass[];
    addTestClass: (className: string) => void;
    addTestToClass: (className: string, testItem: { name: string; description: string }) => void;
    removeTestFromClass: (className: string, index: number) => void;
    removeClass: (className: string) => void;
  };
}

export default function ConfiguracoesPage({ testData }: ConfiguracoesPageProps) {
  const { testClasses, addTestClass, addTestToClass, removeTestFromClass, removeClass } = testData;
  const [newClassName, setNewClassName] = useState('');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      addTestClass(newClassName.trim());
      setNewClassName('');
    }
  };

  const handleAddTest = (e: React.FormEvent<HTMLFormElement>, className: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const testName = formData.get('testName') as string;
    const testDesc = formData.get('testDesc') as string;
    if (testName && testDesc) {
      addTestToClass(className, { name: testName, description: testDesc });
      e.currentTarget.reset();
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Configurar Classes e Testes</h2>
      <div className="mb-8 p-4 border rounded-md bg-gray-700">
        <h3 className="text-lg font-semibold mb-2 text-gray-300">Adicionar Nova Classe</h3>
        <form onSubmit={handleAddClass} className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Ex: Notebook, Smartphone"
            required
            className="flex-grow p-2 border rounded-md bg-gray-600 text-white border-gray-500"
          />
          <button type="submit" className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700">
            Adicionar
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {testClasses.map((testClass) => (
          <div key={testClass.id} className="p-4 border rounded-md border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-bold text-gray-200">{testClass.name}</h4>
                <button onClick={() => removeClass(testClass.name)} className="px-3 py-1 bg-red-700 text-white text-sm rounded-md hover:bg-red-800">
                    Excluir Classe
                </button>
            </div>
            <ul className="space-y-2 mb-4">
              {testClass.test_items.map((test: TestItem, index: number) => (
                <li key={test.id} className="flex justify-between items-center p-2 bg-gray-600 rounded-md">
                  <div>
                    <strong>{test.name}</strong>: <span className="text-gray-400">{test.description}</span>
                  </div>
                  <button onClick={() => removeTestFromClass(testClass.name, index)} className="px-3 py-1 bg-red-800 text-red-200 text-xs rounded-md hover:bg-red-700">
                    Remover
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => handleAddTest(e, testClass.name)} className="flex gap-2 items-end">
              <div className="flex-grow">
                 <label className="text-sm font-semibold text-gray-300">Nome do Teste</label>
                 <input type="text" name="testName" placeholder="Ex: Teclado" required className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500"/>
              </div>
              <div className="flex-grow-[2]">
                 <label className="text-sm font-semibold text-gray-300">Descrição do Teste</label>
                 <input type="text" name="testDesc" placeholder="Verificar todas as teclas" required className="w-full p-2 border rounded-md bg-gray-600 text-white border-gray-500"/>
              </div>
              <button type="submit" className="px-4 py-2 bg-purple-500 text-white font-semibold rounded-md shadow-sm hover:bg-purple-600 self-end">
                + Adicionar Teste
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
