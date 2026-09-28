
import React from 'react';
import { Player } from '../types';

interface PlayerRowProps {
  player: Player;
  onSelect: () => void;
  isSelected: boolean;
  disabled: boolean;
  isTournament?: boolean;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ player, onSelect, isSelected, disabled, isTournament }) => {
    const points = (player.stats.FGM * 2) + (player.stats['3PM'] * 3) + (player.stats.FTM || 0);
    const rebounds = player.stats.OREB + player.stats.DREB;
    const fouls = player.stats.PF || 0;

    const getFoulPointColor = (index: number) => {
        if (isTournament) return index >= 2 ? 'bg-red-500' : 'bg-yellow-500';
        return index >= 4 ? 'bg-red-500' : 'bg-yellow-500';
    };

    return (
        <div 
            onClick={!disabled ? onSelect : undefined}
            className={`rounded-xl p-3 md:p-5 mb-1 transition-all duration-300 cursor-pointer flex items-center justify-between border-2 ${
                disabled 
                ? 'opacity-40 cursor-not-allowed border-transparent' 
                : isSelected 
                ? 'bg-orange-600 border-orange-400 shadow-lg scale-[1.01] z-10' 
                : 'bg-gray-700/50 border-gray-600/50 hover:bg-gray-700 hover:border-orange-500/50'
            }`}
        >
            {/* LINKS: Block mit Nummer, Fouls und Stats untereinander */}
            <div className="flex flex-col gap-2 min-w-[120px] md:min-w-[160px] border-r border-gray-600/50 pr-4">
                <div className="flex items-center gap-3">
                    {player.number !== undefined && (
                        <span className={`font-teko text-3xl md:text-5xl leading-none ${isSelected ? 'text-white' : 'text-orange-500'}`}>
                            #{player.number}
                        </span>
                    )}
                    <div className="flex gap-1">
                        {Array.from({length: fouls}).map((_, i) => (
                             <span key={i} className={`w-2.5 h-2.5 md:w-4 md:h-4 rounded-full shadow-sm ${getFoulPointColor(i)}`}></span>
                        ))}
                    </div>
                </div>

                <div className={`flex gap-4 md:gap-6 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                    <div className="flex flex-col">
                        <span className="text-[9px] md:text-[11px] uppercase font-black tracking-widest opacity-60">Pts</span>
                        <span className="font-teko text-2xl md:text-4xl leading-none">{points}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] md:text-[11px] uppercase font-black tracking-widest opacity-60">Reb</span>
                        <span className="font-teko text-2xl md:text-4xl leading-none">{rebounds}</span>
                    </div>
                </div>
            </div>

            {/* RECHTS: Name als primäres Touch-Ziel */}
            <div className="flex-grow text-right overflow-hidden ml-4">
                <span className={`font-bold text-xl md:text-4xl lg:text-5xl truncate leading-tight uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-100'}`}>
                    {player.name}
                </span>
            </div>
        </div>
    );
};

export default PlayerRow;
