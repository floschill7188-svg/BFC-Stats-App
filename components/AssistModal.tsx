import React from 'react';
import { Player } from '../types';
import { XMarkIcon } from './Icons';

interface AssistModalProps {
  onSelectAssist: (playerId: number | null) => void;
  scorer?: Player;
  potentialAssisters: Player[];
}

const AssistModal: React.FC<AssistModalProps> = ({ onSelectAssist, scorer, potentialAssisters }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => onSelectAssist(null)}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold font-teko">Assist für {scorer?.name || 'Korb'}?</h2>
          <button onClick={() => onSelectAssist(null)} className="text-gray-400 hover:text-white">
            <XMarkIcon />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          <p className="text-gray-400 mb-4 text-center">Wähle den Spieler, der den Assist gegeben hat.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {potentialAssisters.map(player => (
              <button 
                key={player.id} 
                onClick={() => onSelectAssist(player.id)}
                className="p-4 bg-gray-700 hover:bg-orange-600 rounded-lg text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {player.name}
              </button>
            ))}
          </div>
        </main>
        <footer className="p-4 bg-gray-800 border-t border-gray-700">
            <button onClick={() => onSelectAssist(null)} className="w-full px-6 py-4 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold transition-colors transform active:scale-95">
                Kein Assist
            </button>
        </footer>
      </div>
    </div>
  );
};

export default AssistModal;