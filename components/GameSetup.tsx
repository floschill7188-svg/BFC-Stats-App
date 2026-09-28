import React, { useState, useMemo, useEffect } from 'react';
import { MasterRosterPlayer, UserProfile, Season, SEASONS } from '../types';
import { UserGroupIcon } from './Icons';
import ManageRosterModal from './ManageRosterModal';

interface GameSetupProps {
  userProfile: UserProfile | null;
  onSetup: (teamName: string, opponentName: string, selectedPlayers: MasterRosterPlayer[], gameType: 'home' | 'away', season: Season) => void;
  roster: MasterRosterPlayer[];
  onSaveRoster: (newRoster: MasterRosterPlayer[]) => void;
  onCancel: () => void;
}

const TEAMS = ["BFC U18", "BFC Herren 1", "BFC Herren 2"];

const GameSetup: React.FC<GameSetupProps> = ({ userProfile, onSetup, roster, onSaveRoster, onCancel }) => {
    const availableTeams = useMemo(() => {
        if (!userProfile) return [];
        if (userProfile.role === 'Trainer' || userProfile.role === 'CoTrainer') {
            return TEAMS;
        }
        return userProfile.playerTeams || [];
    }, [userProfile]);

    const [teamName, setTeamName] = useState(availableTeams[0] || '');
    const [season, setSeason] = useState<Season>('25/26');
    const [opponentName, setOpponentName] = useState('');
    const [isAwayGame, setIsAwayGame] = useState(false);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
    const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
    const [error, setError] = useState('');

    const rosterForDisplay = useMemo(() => {
        if (!teamName) return [];
        return roster
            .filter(p => p.teams?.includes(teamName))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [roster, teamName]);

    useEffect(() => {
        // Pre-select the first 12 players when the team changes
        setSelectedPlayerIds(new Set(rosterForDisplay.slice(0, 12).map(p => p.id)));
    }, [rosterForDisplay]);
    
    const handlePlayerSelect = (playerId: number) => {
        setSelectedPlayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) {
                newSet.delete(playerId);
            } else {
                newSet.add(playerId);
            }
            return newSet;
        });
    };

    const handleSetup = () => {
        const selectedPlayers = roster.filter(p => selectedPlayerIds.has(p.id));
        if (!teamName) {
            setError('Bitte wähle ein Team aus.');
            return;
        }
        if (selectedPlayers.length < 5) {
            setError('Es müssen mindestens 5 Spieler ausgewählt werden.');
            return;
        }
        if (selectedPlayers.length > 12) {
            setError('Es können maximal 12 Spieler ausgewählt werden.');
            return;
        }
        setError('');

        onSetup(teamName, opponentName, selectedPlayers, isAwayGame ? 'away' : 'home', season);
    };

    return (
        <>
            <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <div className="bg-gray-800 rounded-xl shadow-lg p-6">
                        <h1 className="font-teko text-4xl text-center mb-6">Neues Spiel Einrichten</h1>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="teamName" className="block text-sm font-medium text-gray-300">Dein Team</label>
                                    <select
                                        id="teamName"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="" disabled>-- Team auswählen --</option>
                                        {availableTeams.map(team => (
                                          <option key={team} value={team}>{team}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Saison</label>
                                    <div className="flex bg-gray-700 p-1 rounded-md mt-1 border border-gray-600">
                                        {SEASONS.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setSeason(s)}
                                                className={`flex-1 py-1.5 px-2 text-sm font-semibold rounded transition-colors ${
                                                    season === s ? 'bg-orange-600 text-white shadow' : 'text-gray-300 hover:text-white'
                                                }`}
                                            >
                                                Saison {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center gap-4">
                                <div className="flex-grow">
                                    <label htmlFor="opponentName" className="block text-sm font-medium text-gray-300">Gegner (Optional)</label>
                                    <input
                                        type="text"
                                        id="opponentName"
                                        value={opponentName}
                                        onChange={(e) => setOpponentName(e.target.value)}
                                        placeholder="Name des Gegners"
                                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Spielort</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`font-semibold ${!isAwayGame ? 'text-white' : 'text-gray-500'}`}>Heim</span>
                                        <label htmlFor="game-type-toggle" className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="game-type-toggle" className="sr-only peer" checked={isAwayGame} onChange={() => setIsAwayGame(!isAwayGame)} />
                                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                        </label>
                                        <span className={`font-semibold ${isAwayGame ? 'text-white' : 'text-gray-500'}`}>Auswärts</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold">Spieler ({selectedPlayerIds.size})</h3>
                                    <button onClick={() => setIsRosterModalOpen(true)} className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300">
                                        <UserGroupIcon /> Kader
                                    </button>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2 border border-gray-700">
                                    {rosterForDisplay.length > 0 ? rosterForDisplay.map(player => {
                                        const isSelected = selectedPlayerIds.has(player.id);
                                        return (
                                            <div
                                                key={player.id}
                                                onClick={() => handlePlayerSelect(player.id)}
                                                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-gray-700 border-l-4 border-orange-500' : 'bg-gray-700/40 hover:bg-gray-700/70'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3 flex-grow min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handlePlayerSelect(player.id)}
                                                        className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500 shrink-0"
                                                    />
                                                    <span className="text-white truncate font-medium">{player.name}</span>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-center text-gray-400 py-4">
                                            {teamName ? "Für dieses Team sind keine Spieler im Kader." : "Bitte wähle zuerst ein Team aus."}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-center">{error}</p>}

                            <div className="flex justify-between items-center pt-4">
                                <button
                                    onClick={onCancel}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold transition"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={handleSetup}
                                    className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-transform transform active:scale-95 disabled:opacity-50"
                                    disabled={!teamName}
                                >
                                    Spiel Starten
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ManageRosterModal 
                isOpen={isRosterModalOpen} 
                onClose={() => setIsRosterModalOpen(false)} 
                roster={roster} 
                onSaveRoster={onSaveRoster}
                currentGameTeamName={teamName}
            />
        </>
    );
};

export default GameSetup;