import { DocxUploader } from '@/components/DocxUploader';
import { ManualEditor } from '@/components/ManualEditor';
import { Doc } from 'zod/v4/core';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* <ManualEditor /> */}
        <DocxUploader />
      </div>
    </main>
  );
}
