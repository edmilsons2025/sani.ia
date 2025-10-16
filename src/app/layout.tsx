import './globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'AI Maintenance Manual Generator (Next.js)',
  description: 'Dynamic editor for technical documentation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex">
        <Sidebar />
        <main className="flex-grow p-8">{children}</main>
      </body>
    </html>
  );
}
