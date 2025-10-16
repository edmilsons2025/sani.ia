'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Search, Package, Home } from 'lucide-react';

export function Sidebar() {
  const [isNcmOpen, setIsNcmOpen] = useState(true);

  return (
    <aside className="w-64 h-screen bg-gray-800 text-white p-4 flex flex-col">
      <div className="mb-10">
        <Link href="/" className="text-2xl font-bold flex items-center gap-2">
          <Home size={24} />
          <h1>Sani.IA</h1>
        </Link>
      </div>
      <nav className="flex-grow">
        <ul>
          <li>
            <button
              onClick={() => setIsNcmOpen(!isNcmOpen)}
              className="w-full flex justify-between items-center py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none"
            >
              <span className="font-semibold">NCM</span>
              <ChevronDown
                className={`transform transition-transform duration-200 ${
                  isNcmOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isNcmOpen && (
              <ul className="pl-4 mt-2 space-y-2">
                <li>
                  <Link
                    href="/?view=search"
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-700"
                  >
                    <Search size={18} />
                    <span>NCM Search</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/?view=processor"
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-700"
                  >
                    <Package size={18} />
                    <span>NCM em Lote</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  );
}
