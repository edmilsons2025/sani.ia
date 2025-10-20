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
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );
}
