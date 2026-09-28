
import React, { useState, useEffect } from 'react';
import { Team, Player, PlayerStats } from '../types';
import { XMarkIcon } from './Icons';

interface PostGameStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onSave: (updatedPlayers: Player[]) => void;
}

type EditableStats = Pick<PlayerStats, 'MIN' | 'FTM' | 'FTA' | 'PF' | 'PLUS_MINUS'>;
type WritableStats = Omit<EditableStats, 'MIN'>;

// Helper to convert decimal minutes to MM:SS string
const formatMinutesToString = (minutes: number | undefined): string => {
    if (minutes === undefined || minutes === null || isNaN(minutes)) return '';
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Helper to parse MM:SS string to decimal minutes
const parseMinutesStringToNumber = (value: string | undefined): number | undefined => {
    if (!value?.trim()) return undefined;
    const parts = value.split(':');
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1] || '0', 10);

    if (isNaN(mins)) return undefined;
    if (isNaN(secs)) return mins;
    
    // Clamp seconds to 59 to avoid invalid time inputs causing weird minute values
    const clampedSecs = Math.min(secs, 59);

    return mins + clampedSecs / 60;
};


const PostGameStatsModal: React.FC<PostGameStatsModalProps> = ({ isOpen, onClose, team, onSave }) => {
  const [stats, setStats] = useState<Record<number, WritableStats>>({});
  const [minuteStrings, setMinuteStrings] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      const initialStats: Record<number, WritableStats> = {};
      const initialMinuteStrings: Record<number, string> = {};
      
      team.players.forEach(player => {
        initialStats[player.id] = {
          FTM: player.stats.FTM ?? undefined,
          FTA: player.stats.FTA ?? undefined,
          PF: player.stats.PF ?? undefined,
          PLUS_MINUS: player.stats.PLUS_MINUS ?? undefined,
        };
        initialMinuteStrings[player.id] = formatMinutesToString(player.stats.MIN);
      });

      setStats(initialStats);
      setMinuteStrings(initialMinuteStrings);
    }
  }, [isOpen, team.players]);

  if (!isOpen) return null;

  const handleStatChange = (playerId: number, statKey: keyof WritableStats, value: string) => {
    if (value === '' || (value === '-' && statKey === 'PLUS_MINUS')) {
        setStats(prev => ({
            ...prev,
            [playerId]: { ...prev[playerId], [statKey]: undefined },
        }));
        return;
    }
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue)) {
        setStats(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [statKey]: numericValue,
            },
        }));
    }
  };

  const handleMinutesChange = (playerId: number, value: string) => {
    const sanitizedValue = value.replace(/[^0-9:]/g, '');
    let finalValue = sanitizedValue;
    if (finalValue.length > 5) {
        finalValue = finalValue.substring(0, 5);
    }
    setMinuteStrings(prev => ({ ...prev, [playerId]: finalValue }));
  };


  const handleSave = () => {
    const updatedPlayers = team.players.map(player => {
        const postGameStats = stats[player.id];
        const minuteValue = parseMinutesStringToNumber(minuteStrings[player.id]);
        return {
            ...player,
            stats: {
                ...player.stats,
                ...postGameStats,
                MIN: minuteValue
            }
        };
    });
    onSave(updatedPlayers);
  };
  
  const SingleStatInput: React.FC<{
    id: string;
    value: number | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    isNegativeAllowed?: boolean;
  }> = ({ id, value, onChange, placeholder, isNegativeAllowed = false }) => (
     <input
        id={id}
        type="number"
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        min={isNegativeAllowed ? undefined : 0}
        className="w-20 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-center"
     />
  );


  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold font-teko">Kampfgericht-Stats Nacherfassen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
            <div className="space-y-4">
                {/* Header Row */}
                <div className="hidden md:grid grid-cols-6 gap-4 px-4 text-sm font-semibold text-gray-400">
                    <div className="col-span-2">Spieler</div>
                    <div className="text-center">MIN</div>
                    <div className="text-center">FW (M-A)</div>
                    <div className="text-center">PF</div>
                    <div className="text-center">+/-</div>
                </div>
                {team.players.map(player => (
                    <div key={player.id} className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="md:hidden font-medium text-white mb-3">
                           {player.name} <span className="text-gray-400">{player.number !== null ? `#${player.number}`: '#--'}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-x-3 gap-y-4 md:gap-4 items-center">
                            <div className="hidden md:block col-span-2 font-medium text-white">
                                {player.name} <span className="text-gray-400">{player.number !== null ? `#${player.number}`: '#--'}</span>
                            </div>
                            
                            {/* MIN Input */}
                            <div className="flex flex-col items-center">
                                <label htmlFor={`min-${player.id}`} className="text-xs text-gray-400 mb-1 md:hidden">MIN</label>
                                <input
                                    id={`min-${player.id}`}
                                    type="text"
                                    value={minuteStrings[player.id] ?? ''}
                                    onChange={(e) => handleMinutesChange(player.id, e.target.value)}
                                    placeholder="MM:SS"
                                    className="w-20 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-center"
                                />
                            </div>

                            {/* FT Inputs */}
                            <div className="flex flex-col items-center">
                                <label className="text-xs text-gray-400 mb-1 md:hidden">FW (M-A)</label>
                                <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 focus-within:ring-1 focus-within:ring-orange-500 w-20 justify-center">
                                    <input
                                        type="number"
                                        value={stats[player.id]?.FTM ?? ''}
                                        onChange={(e) => handleStatChange(player.id, 'FTM', e.target.value)}
                                        placeholder="M"
                                        min={0}
                                        className="w-full bg-transparent text-white focus:outline-none text-center"
                                        aria-label={`Freiwürfe getroffen für ${player.name}`}
                                    />
                                    <span className="text-gray-500">-</span>
                                    <input
                                        type="number"
                                        value={stats[player.id]?.FTA ?? ''}
                                        onChange={(e) => handleStatChange(player.id, 'FTA', e.target.value)}
                                        placeholder="A"
                                        min={0}
                                        className="w-full bg-transparent text-white focus:outline-none text-center"
                                        aria-label={`Freiwürfe versucht für ${player.name}`}
                                    />
                                </div>
                            </div>
                            
                            {/* PF Input */}
                            <div className="flex flex-col items-center">
                                <label htmlFor={`pf-${player.id}`} className="text-xs text-gray-400 mb-1 md:hidden">PF</label>
                                <SingleStatInput 
                                    id={`pf-${player.id}`}
                                    value={stats[player.id]?.PF}
                                    onChange={(e) => handleStatChange(player.id, 'PF', e.target.value)}
                                    placeholder="PF"
                                />
                            </div>

                            {/* +/- Input */}
                            <div className="flex flex-col items-center">
                                <label htmlFor={`plusminus-${player.id}`} className="text-xs text-gray-400 mb-1 md:hidden">+/-</label>
                                <SingleStatInput 
                                    id={`plusminus-${player.id}`}
                                    value={stats[player.id]?.PLUS_MINUS}
                                    onChange={(e) => handleStatChange(player.id, 'PLUS_MINUS', e.target.value)}
                                    placeholder="+/-"
                                    isNegativeAllowed={true}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
        <footer className="p-4 border-t border-gray-700 bg-gray-800 flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">
                Abbrechen
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                Statistiken Speichern
            </button>
        </footer>
      </div>
    </div>
  );
};

export default PostGameStatsModal;