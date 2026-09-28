
import React, { useState, useEffect } from 'react';
import { MasterRosterPlayer, UserProfile } from '../types';
import { ArrowLeftIcon, SparklesIcon, TrashIcon, PlusIcon } from './Icons';
import { TOURNAMENT_TEMPLATES } from '../utils/rosterStorage';

interface TournamentSetupProps {
  userProfile: UserProfile | null;
  onSetup: (teamName: string, opponentName: string, selectedPlayers: MasterRosterPlayer[]) => void;
  roster: MasterRosterPlayer[];
  onCancel: () => void;
}

const TOURNAMENT_TEAMS = Object.keys(TOURNAMENT_TEMPLATES);

const TournamentSetup: React.FC<TournamentSetupProps> = ({ userProfile, onSetup, roster, onCancel }) => {
    const [teamName, setTeamName] = useState(TOURNAMENT_TEAMS[0]);
    const [opponentName, setOpponentName] = useState(TOURNAMENT_TEAMS[1]);
    const [localPlayers, setLocalPlayers] = useState<{name: string, id: number}[]>([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [error, setError] = useState('');

    // Load initial template when teamName changes
    useEffect(() => {
        const template = TOURNAMENT_TEMPLATES[teamName] || [];
        setLocalPlayers(template.map((name, index) => ({ 
            name, 
            id: Date.now() + index 
        })));
    }, [teamName]);

    const handleAddPlayer = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newPlayerName.trim()) return;
        setLocalPlayers(prev => [...prev, { name: newPlayerName.trim(), id: Date.now() }]);
        setNewPlayerName('');
    };

    const handleRemovePlayer = (id: number) => {
        setLocalPlayers(prev => prev.filter(p => p.id !== id));
    };

    const handleStart = () => {
        if (teamName === opponentName) {
            setError('Ein Team kann nicht gegen sich selbst spielen.');
            return;
        }
        if (localPlayers.length < 5) {
            setError('Wähle mindestens 5 Spieler für das Team aus.');
            return;
        }
        
        // Convert local players back to MasterRosterPlayer structure for the game
        const finalPlayers: MasterRosterPlayer[] = localPlayers.map(p => ({
            id: p.id,
            name: p.name,
            teams: [teamName]
        }));

        onSetup(teamName, opponentName, finalPlayers);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
            <div className="max-w-2xl mx-auto">
                <button onClick={onCancel} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold mb-6 transition-colors">
                    <ArrowLeftIcon /> <span>Abbrechen</span>
                </button>
                
                <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-green-600/30">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-green-900/50 rounded-full text-green-400">
                            <SparklesIcon />
                        </div>
                        <h1 className="font-teko text-4xl">Weihnachtszock einrichten</h1>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Team (Vorlagen)</label>
                            <select 
                                value={teamName} 
                                onChange={(e) => setTeamName(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                {TOURNAMENT_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Gegner</label>
                            <select 
                                value={opponentName} 
                                onChange={(e) => setOpponentName(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                {TOURNAMENT_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 flex justify-between">
                            <span>Aufstellung für {teamName}</span>
                            <span className="text-green-400">{localPlayers.length} Spieler</span>
                        </h3>
                        
                        <div className="space-y-2 mb-4">
                            {localPlayers.map(player => (
                                <div key={player.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700 group">
                                    <span className="text-white font-medium">{player.name}</span>
                                    <button 
                                        onClick={() => handleRemovePlayer(player.id)}
                                        className="text-gray-500 hover:text-red-400 p-1"
                                        title="Spieler entfernen"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleAddPlayer} className="flex gap-2">
                            <input 
                                type="text"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                placeholder="Spielername ergänzen..."
                                className="flex-grow bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button 
                                type="submit"
                                className="bg-green-700 hover:bg-green-600 text-white p-2 rounded-lg"
                                title="Hinzufügen"
                            >
                                <PlusIcon />
                            </button>
                        </form>
                    </div>

                    {error && <p className="text-red-400 text-center mb-4 font-semibold">{error}</p>}

                    <button 
                        onClick={handleStart}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold font-teko transition-all transform active:scale-95 shadow-xl mt-4"
                    >
                        SPIEL STARTEN 🏀
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TournamentSetup;
