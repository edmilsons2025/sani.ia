'use client';

interface NavButtonProps {
    currentView: string;
    view: string;
    setView: (view: string) => void;
    label: string;
}

export function NavButton({ currentView, view, setView, label }: NavButtonProps) {
    const isActive = currentView === view;
    return (
        <button
            onClick={() => setView(view)}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                isActive 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
            {label}
        </button>
    );
}
