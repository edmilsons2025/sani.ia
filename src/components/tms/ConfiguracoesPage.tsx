'use client';

import { useState } from 'react';

interface ConfiguracoesPageProps {
  testData: any;
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
      addTestToClass(className, { name: testName, desc: testDesc });
      e.currentTarget.reset();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configurar Classes e Testes</h2>
      <div className="mb-8 p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">Adicionar Nova Classe</h3>
        <form onSubmit={handleAddClass} className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Ex: Notebook, Smartphone"
            required
            className="flex-grow p-2 border rounded-md"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
            Adicionar
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {Object.keys(testClasses).map((className) => (
          <div key={className} className="p-4 border rounded-md">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-bold text-gray-700">{className}</h4>
                <button onClick={() => removeClass(className)} className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                    Excluir Classe
                </button>
            </div>
            <ul className="space-y-2 mb-4">
              {testClasses[className].map((test: any, index: number) => (
                <li key={test.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                  <div>
                    <strong>{test.name}</strong>: <span className="text-gray-600">{test.desc}</span>
                  </div>
                  <button onClick={() => removeTestFromClass(className, index)} className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200">
                    Remover
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => handleAddTest(e, className)} className="flex gap-2 items-end">
              <div className="flex-grow">
                 <label className="text-sm font-semibold">Nome do Teste</label>
                 <input type="text" name="testName" placeholder="Ex: Teclado" required className="w-full p-2 border rounded-md"/>
              </div>
              <div className="flex-grow-[2]">
                 <label className="text-sm font-semibold">Descrição do Teste</label>
                 <input type="text" name="testDesc" placeholder="Verificar todas as teclas" required className="w-full p-2 border rounded-md"/>
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 self-end">
                + Adicionar Teste
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
