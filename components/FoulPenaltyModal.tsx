import React from 'react';
import { Player } from '../types';
import { CheckIcon } from './Icons';

interface FoulPenaltyModalProps {
  player: Player;
  onConfirm: () => void;
}

const FoulPenaltyModal: React.FC<FoulPenaltyModalProps> = ({ player, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
      <div className="bg-gray-800 border-2 border-red-600 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-short">
        <div className="bg-red-600 p-4 text-center">
            <h2 className="text-white font-teko text-3xl uppercase tracking-widest">3. Foul - Strafe!</h2>
        </div>
        <main className="p-6 text-center">
            <p className="text-gray-300 text-lg mb-2">
                Spieler: <span className="text-white font-bold text-xl">{player.name}</span>
            </p>
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-400 font-bold text-lg mb-1">+2 PUNKTE FÜR GEGNER</p>
                <p className="text-gray-400 text-sm">Bitte sofort dem Kampfgericht melden!</p>
            </div>
            <button 
                onClick={onConfirm}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold font-teko transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
                <CheckIcon /> VERSTANDEN / GEMELDET
            </button>
        </main>
      </div>
    </div>
  );
};

export default FoulPenaltyModal;