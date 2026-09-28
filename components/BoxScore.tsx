

import React from 'react';
import { Team, Opponent } from '../types';
import { XMarkIcon, SparklesIcon } from './Icons';
import { TeamTable } from './StatTable';

interface BoxScoreProps {
  team: Team;
  opponent: Opponent;
  onClose: () => void;
  onAnalyze: () => void;
}

const BoxScore: React.FC<BoxScoreProps> = ({ team, opponent, onClose, onAnalyze }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold font-teko">Box Score: {team.name} vs {opponent.name}</h2>
          <div className="flex items-center gap-4">
            <button onClick={onAnalyze} className="flex items-center gap-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-semibold">
                <SparklesIcon /> KI-Analyse
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon />
            </button>
          </div>
        </header>
        <main className="p-6 overflow-y-auto">
          <TeamTable team={team} />
        </main>
      </div>
    </div>
  );
};

export default BoxScore;