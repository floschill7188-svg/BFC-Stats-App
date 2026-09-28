
import React, { useMemo } from 'react';
import { Team, Player } from '../types';
import PlayerRow from './PlayerRow';

interface TeamDisplayProps {
  team: Team;
  onPlayerSelect: (playerId: number) => void;
  selectedPlayerId: number | null;
  disabled: boolean;
  isTournament?: boolean;
  onUpdateStat: (playerId: number, stat: any, value: number) => void;
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({ team, onPlayerSelect, selectedPlayerId, disabled, isTournament, onUpdateStat }) => {
  const activePlayers = useMemo(() => team.players.filter(p => p.onCourt !== false), [team.players]);
  const benchPlayers = useMemo(() => team.players.filter(p => p.onCourt === false), [team.players]);

  return (
    <div className="bg-gray-800 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden border border-gray-700">
      <div className="flex-grow overflow-y-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-sm md:text-lg font-black text-gray-500 uppercase tracking-widest">Spielfeld ({activePlayers.length}/5)</h3>
        </div>
        <div className="flex flex-col gap-2 md:gap-3 mb-6">
          {activePlayers.sort((a,b) => (a.number ?? 999) - (b.number ?? 999)).map(player => (
            <PlayerRow 
                key={player.id}
                player={player} 
                onSelect={() => onPlayerSelect(player.id)}
                isSelected={selectedPlayerId === player.id}
                disabled={disabled}
                isTournament={isTournament}
            />
          ))}
        </div>

        {isTournament && benchPlayers.length > 0 && (
            <>
                <h3 className="text-sm md:text-lg font-black text-gray-500 uppercase tracking-widest px-2 mb-3 border-t border-gray-700 pt-4">Bank</h3>
                <div className="grid grid-cols-2 gap-3 opacity-60">
                    {benchPlayers.map(player => (
                        <button key={player.id} onClick={() => onUpdateStat(player.id, 'onCourt', 1)} className="bg-gray-700 p-3 rounded-xl text-left border border-gray-600 flex justify-between items-center shadow-md active:scale-95">
                            <span className="font-bold text-sm md:text-base">{player.name}</span>
                            <span className="text-[10px] bg-green-600 px-2 py-1 rounded font-bold">EIN</span>
                        </button>
                    ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default TeamDisplay;
