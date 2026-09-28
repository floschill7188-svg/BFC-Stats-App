
import React, { useState, useRef, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { GameState, MasterRosterPlayer, UserProfile, Player, PlayerStats, Team, View, Season, SEASONS } from '../types';
import DeleteGameModal from './DeleteGameModal';
import NotificationBell from './NotificationBell';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowUpTrayIcon, ChartBarIcon, Cog6ToothIcon, UserGroupIcon, PlayIcon, ArrowRightOnRectangleIcon, TrashIcon, CloudArrowUpIcon, BeerIcon, SparklesIcon } from './Icons';
import { ToastType } from './ToastNotification';

interface HomeProps {
    userProfile: UserProfile | null;
    onStartNewGame: () => void;
    onManageRoster: () => void;
    onViewSeasonStats: () => void;
    onManageAccount: () => void;
    onManageUsers: () => void;
    onViewBeerList: () => void;
    inProgressGame: GameState | null;
    onResumeGame: () => void;
    completedGames: GameState[];
    unsyncedGames: GameState[];
    onSyncGames: () => void;
    roster: MasterRosterPlayer[];
    onViewGameSummary: (game: GameState) => void;
    onDeleteGame: (gameId: number) => void;
    onImportGame: (file: File) => void;
    onNavigate: (view: View) => void;
    showToast: (message: string, type?: ToastType) => void;
}

const StatCard: React.FC<{ title: string; children: React.ReactNode; className?: string, subtitle?: string }> = ({ title, children, className, subtitle }) => (
    <div className={`bg-gray-800 rounded-xl shadow-lg p-5 md:p-6 ${className}`}>
        <div className="border-b border-gray-700 pb-3 mb-4">
             <h3 className="font-teko text-2xl md:text-4xl text-orange-400">{title}</h3>
             {subtitle && <p className="text-sm text-gray-400 -mt-1">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {children}
        </div>
    </div>
);

const StatItem: React.FC<{ label: string; value: string | number; average?: string | number | null }> = ({ label, value, average }) => (
    <div>
        <p className="text-xs md:text-sm text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="font-teko text-3xl md:text-5xl text-white leading-tight">{value}</p>
        {average && <p className="text-xs text-gray-500 -mt-1">{average}</p>}
    </div>
);

const PlayerHomeView: React.FC<{
    userProfile: UserProfile | null;
    roster: MasterRosterPlayer[];
    completedGames: GameState[];
}> = ({ userProfile, roster, completedGames }) => {
    const [selectedSeason, setSelectedSeason] = useState<Season | 'all'>('25/26');
    const linkedPlayerId = userProfile?.linkedRosterPlayerId;
    if (!linkedPlayerId) return null;

    const linkedRosterPlayer = roster.find(p => p.id === linkedPlayerId);
    if (!linkedRosterPlayer) return null;
    
    const { aggregatedStats, gamesPlayed } = useMemo(() => {
        const stats: PlayerStats = { FGM: 0, FGA: 0, '3PM': 0, '3PA': 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TO: 0, MIN: 0, FTM: 0, FTA: 0, PF: 0, PLUS_MINUS: 0 };
        let playedCount = 0;
        completedGames.forEach(game => {
            const gSeason = game.season || '25/26';
            if (selectedSeason !== 'all' && gSeason !== selectedSeason) return;

            const gamePlayer = game.team.players.find(p => p.id === linkedPlayerId);
            if (gamePlayer) {
                playedCount++;
                for (const key in stats) {
                    const statKey = key as keyof PlayerStats;
                    stats[statKey] = (stats[statKey] || 0) + (gamePlayer.stats[statKey] || 0);
                }
            }
        });
        return { aggregatedStats: stats, gamesPlayed: playedCount };
    }, [completedGames, linkedPlayerId, selectedSeason]);

    const derivedStats = useMemo(() => {
        const stats = aggregatedStats;
        const gp = gamesPlayed > 0 ? gamesPlayed : 1; 
        const formatAvg = (val: number) => (val / gp).toFixed(1);
        const points = (stats.FGM * 2) + (stats['3PM'] * 3) + (stats.FTM || 0);
        const rebounds = stats.OREB + stats.DREB;
        return {
            avgPoints: formatAvg(points),
            avgRebounds: formatAvg(rebounds),
            avgAssists: formatAvg(stats.AST),
            avgSteals: formatAvg(stats.STL),
            avgBlocks: formatAvg(stats.BLK),
            avgTurnovers: formatAvg(stats.TO),
        };
    }, [aggregatedStats, gamesPlayed]);

    return (
        <div className="mb-8">
            <header className="bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-teko text-5xl md:text-7xl">{linkedRosterPlayer.name}</h1>
                    <div className="text-gray-400 mt-1">
                        <span className="text-lg font-semibold">{gamesPlayed} Spiel(e) in {selectedSeason === 'all' ? 'allen Saisons' : `Saison ${selectedSeason}`}</span>
                    </div>
                </div>
                <div className="flex bg-gray-700 p-1 rounded-lg">
                    {SEASONS.map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSeason(s)}
                            className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${
                                selectedSeason === s ? 'bg-orange-600 text-white shadow' : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            Saison {s}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setSelectedSeason('all')}
                        className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${
                            selectedSeason === 'all' ? 'bg-orange-600 text-white shadow' : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        Alle
                    </button>
                </div>
            </header>
            <main>
                <StatCard title={`Saison (${selectedSeason === 'all' ? 'Alle' : selectedSeason} - Pro Spiel)`}>
                    <StatItem label="Punkte" value={derivedStats.avgPoints} />
                    <StatItem label="Rebounds" value={derivedStats.avgRebounds} />
                    <StatItem label="Assists" value={derivedStats.avgAssists} />
                    <StatItem label="Steals" value={derivedStats.avgSteals} />
                    <StatItem label="Blocks" value={derivedStats.avgBlocks} />
                    <StatItem label="Turnovers" value={derivedStats.avgTurnovers} />
                </StatCard>
            </main>
        </div>
    );
};

const Home: React.FC<HomeProps> = ({
    userProfile, onStartNewGame, onManageRoster, onViewSeasonStats, onManageAccount, onManageUsers, onViewBeerList,
    inProgressGame, onResumeGame, completedGames, unsyncedGames, onSyncGames, roster, onViewGameSummary, onDeleteGame,
    onImportGame, onNavigate, showToast
}) => {
    const [gameToDelete, setGameToDelete] = useState<GameState | null>(null);
    const [filterSeason, setFilterSeason] = useState<Season | 'all'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isCoach = userProfile?.role === 'Trainer' || userProfile?.role === 'CoTrainer';
    const isHeadCoach = userProfile?.role === 'Trainer'; 
    const isLinkedAsPlayer = !!userProfile?.linkedRosterPlayerId;

    const allGames = useMemo(() => {
        const mappedUnsynced = unsyncedGames.map(g => ({ ...g, isUnsynced: true }));
        const mappedSynced = completedGames.map(g => ({ ...g, isUnsynced: false }));
        let combined = [...mappedUnsynced, ...mappedSynced].sort((a, b) => b.gameId - a.gameId);
        if (filterSeason !== 'all') {
            combined = combined.filter(g => (g.season || '25/26') === filterSeason);
        }
        return combined;
    }, [completedGames, unsyncedGames, filterSeason]);

    return (
        <>
            <div className="min-h-screen w-full bg-gray-900 text-gray-100 p-4 sm:p-6 md:p-10 overflow-y-auto pb-40">
                <div className="w-full">
                    <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                        <div className="text-center md:text-left">
                            <h1 className="font-teko text-5xl md:text-7xl leading-none">BFC Stats Tracker</h1>
                            <p className="text-gray-400 text-lg">Willkommen, {userProfile?.displayName || 'Gast'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {userProfile && <NotificationBell userProfile={userProfile} onNavigate={onNavigate} onViewGameSummary={onViewGameSummary} completedGames={completedGames} />}
                            <button onClick={onManageAccount} className="p-4 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-all hover:scale-110 shadow-lg"><Cog6ToothIcon /></button>
                            <button onClick={() => signOut(auth)} className="p-4 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-all hover:scale-110 shadow-lg"><ArrowRightOnRectangleIcon /></button>
                        </div>
                    </header>
                    
                    <main>
                        {inProgressGame && (
                            <div className="mb-8 bg-blue-900/30 border-2 border-blue-700/50 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                                <div className="text-center md:text-left">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="font-teko text-3xl md:text-5xl">{inProgressGame.team.name} vs. {inProgressGame.opponent.name}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-900/80 border border-indigo-500/70 text-indigo-200">
                                            Saison {inProgressGame.season || '25/26'}
                                        </span>
                                    </div>
                                    <p className="text-blue-300 text-xl font-medium">Stand: {inProgressGame.team.score} Punkte | Viertel: {inProgressGame.quarter}</p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={onResumeGame} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105 flex items-center gap-2 shadow-xl"><PlayIcon /> Fortsetzen</button>
                                </div>
                            </div>
                        )}

                        {isCoach && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mb-12">
                                <ActionButton icon={<PlayIcon className="w-8 h-8"/>} label="Neues Spiel" onClick={onStartNewGame} disabled={!!inProgressGame}/>
                                <ActionButton icon={<UserGroupIcon className="w-8 h-8"/>} label="Kader" onClick={onManageRoster} />
                                <ActionButton icon={<ChartBarIcon className="w-8 h-8"/>} label="Saison Stats" onClick={onViewSeasonStats} />
                                <ActionButton icon={<BeerIcon className="w-8 h-8"/>} label="Bier Liste" onClick={onViewBeerList} />
                                {isHeadCoach && <ActionButton icon={<UserGroupIcon className="w-8 h-8"/>} label="Benutzer" onClick={() => onNavigate('userManagement')} />}
                                <ActionButton icon={<ArrowUpTrayIcon className="w-8 h-8"/>} label="Import" onClick={() => fileInputRef.current?.click()} />
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && onImportGame(e.target.files[0])} className="hidden" accept=".xlsx, .xls" />

                        {isLinkedAsPlayer && <PlayerHomeView userProfile={userProfile} roster={roster} completedGames={completedGames} />}

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="font-teko text-4xl">Letzte Spiele</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Saison:</span>
                                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setFilterSeason('all')}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                            filterSeason === 'all' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Alle
                                    </button>
                                    {SEASONS.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setFilterSeason(s)}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                                filterSeason === s ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {allGames.map(game => (
                                <div key={game.gameId} className="bg-gray-800 rounded-xl p-6 flex justify-between items-center shadow-xl border border-gray-700 hover:border-orange-500 transition-all group relative">
                                    <div className="pr-6 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="text-sm text-gray-500">{format(new Date(game.gameId), 'dd.MM.yyyy', { locale: de })}</p>
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-900/80 border border-indigo-600/70 text-indigo-300">
                                                Saison {game.season || '25/26'}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold group-hover:text-orange-400 transition-colors truncate">{game.team.name} vs. {game.opponent.name}</h3>
                                        <p className="font-teko text-4xl text-orange-500 mt-1">{game.team.score} Pkt</p>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button onClick={() => onViewGameSummary(game)} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-bold transition-all shadow-lg active:scale-95">Details</button>
                                        {isCoach && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setGameToDelete(game); }} 
                                                className="p-2 text-gray-500 hover:text-red-500 transition-colors flex justify-center"
                                                title="Spiel löschen"
                                            >
                                                <TrashIcon />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {allGames.length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-400">
                                    Keine Spiele für die ausgewählte Saison gefunden.
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
            <DeleteGameModal isOpen={!!gameToDelete} onClose={() => setGameToDelete(null)} onConfirm={() => gameToDelete && (onDeleteGame(gameToDelete.gameId), setGameToDelete(null))} />
        </>
    );
};

const ActionButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean, className?: string }> = ({ icon, label, onClick, disabled = false, className = "" }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`bg-gray-800 hover:bg-gray-700/80 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 text-center transition-all shadow-xl border-2 border-transparent hover:border-orange-500 disabled:opacity-50 h-32 md:h-40 ${className}`}
    >
        <div className={`transition-colors ${disabled ? 'text-gray-600' : 'text-orange-500'}`}>{icon}</div>
        <span className="font-teko text-xl md:text-2xl uppercase tracking-widest">{label}</span>
    </button>
);

export default Home;
