import './globals.css';
import type { Metadata } from 'next';

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
      <body>{children}</body>
    </html>
  );
}
