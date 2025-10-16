'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { NcmSearch } from '@/components/NcmSearch';
import { NcmProcessor } from '@/components/NcmProcessor';
import Link from 'next/link';
import { Search, Package } from 'lucide-react';

function InitialScreen() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Bem-vindo ao Sani.IA</h1>
      <p className="text-lg text-gray-600 mb-8">Selecione uma das ferramentas no menu lateral para começar.</p>
    </div>
  );
}

function RenderContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  switch (view) {
    case 'search':
      return <NcmSearch />;
    case 'processor':
      return <NcmProcessor />;
    default:
      return <InitialScreen />;
  }
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-full w-full mx-auto">
        <Suspense fallback={<div>Carregando...</div>}>
          <RenderContent />
        </Suspense>
      </div>
    </main>
  );
}