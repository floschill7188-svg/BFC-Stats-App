import React, { useState, useMemo, useRef } from 'react';
import { GameState, MasterRosterPlayer, Player, Team, UserProfile, Season, SEASONS } from '../types';
import { TeamTable } from './StatTable';
import AiAnalysis from './AiAnalysis';
import { exportSeasonToCsv, exportSeasonToXls } from '../utils/stats';
import { SparklesIcon, DocumentArrowDownIcon, PhotoIcon, ShareIcon, TableCellsIcon } from './Icons';

// Deklariert html2canvas für TypeScript, da es über ein Skript-Tag geladen wird
declare const html2canvas: any;

interface SeasonStatsProps {
    completedGames: GameState[];
    roster: MasterRosterPlayer[];
    onBack: () => void;
    userProfile: UserProfile | null;
    initialSelectedTeam?: string;
}

const TEAMS = ["BFC U18", "BFC Herren 1", "BFC Herren 2"];

type StatViewMode = 'total' | 'average' | 'per30min';

const SeasonStats: React.FC<SeasonStatsProps> = ({ completedGames, roster, onBack, userProfile, initialSelectedTeam }) => {
    
    const availableTeams = useMemo(() => {
        if (!userProfile) return [];
        if (userProfile.role === 'Trainer' || userProfile.role === 'CoTrainer') {
            return TEAMS;
        }
        return userProfile.playerTeams || [];
    }, [userProfile]);
    
    const [selectedTeam, setSelectedTeam] = useState<string>(() => {
        if (initialSelectedTeam && availableTeams.includes(initialSelectedTeam)) {
            return initialSelectedTeam;
        }
        return availableTeams[0] || '';
    });

    const [selectedSeason, setSelectedSeason] = useState<Season | 'all'>('25/26');
    const [statViewMode, setStatViewMode] = useState<StatViewMode>('total');
    const [showAiAnalysis, setShowAiAnalysis] = useState(false);
    const [isSavingImage, setIsSavingImage] = useState(false);
    const statContainerRef = useRef<HTMLDivElement>(null);

    const isCoach = userProfile?.role === 'Trainer' || userProfile?.role === 'CoTrainer';
    
    const gamesForUser = completedGames;

    const gamesForTeam = useMemo(() => {
        if (!selectedTeam) return [];
        return gamesForUser.filter(g => {
            if (g.team.name !== selectedTeam) return false;
            if (selectedSeason === 'all') return true;
            const gameSeason = g.season || '25/26';
            return gameSeason === selectedSeason;
        });
    }, [gamesForUser, selectedTeam, selectedSeason]);

    const displayData = useMemo<Team | null>(() => {
        if (!selectedTeam) return null;

        const gameCount = gamesForTeam.length;
        const gameCountText = `${gameCount} ${gameCount === 1 ? 'Spiel' : 'Spiele'}`;

        const playerStatsMap = new Map<number, { playerInfo: MasterRosterPlayer, stats: Player['stats'], gamesPlayed: number }>();
        roster
            .filter(p => !selectedTeam || p.teams?.includes(selectedTeam))
            .forEach(rosterPlayer => {
                playerStatsMap.set(rosterPlayer.id, {
                    playerInfo: rosterPlayer,
                    stats: { FGM: 0, FGA: 0, '3PM': 0, '3PA': 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TO: 0, MIN: 0, FTM: 0, FTA: 0, PF: 0, PLUS_MINUS: 0 },
                    gamesPlayed: 0
                });
            });

        gamesForTeam.forEach(game => {
            game.team.players.forEach(gamePlayer => {
                let entry = playerStatsMap.get(gamePlayer.id);
                if (!entry) {
                    const fallbackRoster: MasterRosterPlayer = {
                        id: gamePlayer.id,
                        name: gamePlayer.name,
                        number: gamePlayer.number,
                        teams: gamePlayer.teams || (selectedTeam ? [selectedTeam] : []),
                    };
                    entry = {
                        playerInfo: fallbackRoster,
                        stats: { FGM: 0, FGA: 0, '3PM': 0, '3PA': 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TO: 0, MIN: 0, FTM: 0, FTA: 0, PF: 0, PLUS_MINUS: 0 },
                        gamesPlayed: 0
                    };
                    playerStatsMap.set(gamePlayer.id, entry);
                }
                entry.gamesPlayed += 1;
                for (const key in entry.stats) {
                    const statKey = key as keyof Player['stats'];
                    entry.stats[statKey] = (entry.stats[statKey] || 0) + (gamePlayer.stats[statKey] || 0);
                }
            });
        });

        const seasonPlayers: Player[] = Array.from(playerStatsMap.values())
            .map(entry => {
                if (statViewMode === 'average' && entry.gamesPlayed > 0) {
                    const averagedStats = { ...entry.stats };
                    for (const key in averagedStats) {
                        const statKey = key as keyof Player['stats'];
                        const val = averagedStats[statKey];
                        if (val !== undefined && val !== null) {
                            averagedStats[statKey] = val / entry.gamesPlayed;
                        }
                    }
                    return { ...entry.playerInfo, stats: averagedStats };
                }

                if (statViewMode === 'per30min' && entry.stats.MIN && entry.stats.MIN > 0 && entry.gamesPlayed > 0) {
                    const scaledStats: Player['stats'] = { ...entry.stats };
                    const avgMinutes = entry.stats.MIN / entry.gamesPlayed;
                    if (avgMinutes === 0) return { ...entry.playerInfo, stats: entry.stats };
                    
                    const scaleFactor = 30 / avgMinutes;

                    for (const key in scaledStats) {
                        const statKey = key as keyof Player['stats'];
                        const avgStatValue = (entry.stats[statKey] || 0) / entry.gamesPlayed;
                        
                        if (statKey !== 'MIN') {
                            scaledStats[statKey] = avgStatValue * scaleFactor;
                        }
                    }
                    scaledStats.MIN = 30;
                    return { ...entry.playerInfo, stats: scaledStats };
                }
                
                return { ...entry.playerInfo, stats: entry.stats };
        });

        const absoluteTotalScore = gamesForTeam.reduce((acc, game) => acc + game.team.score, 0);
        let displayScore = absoluteTotalScore;
        const seasonLabel = selectedSeason === 'all' ? 'Alle Saisons' : `Saison ${selectedSeason}`;
        let viewModeText = `(${seasonLabel} - Gesamt)`;

        if (statViewMode === 'average' && gameCount > 0) {
            displayScore = absoluteTotalScore / gameCount;
            viewModeText = `(${seasonLabel} - Pro Spiel)`;
        } else if (statViewMode === 'per30min') {
             displayScore = seasonPlayers.reduce((acc, p) => {
                const points = (p.stats.FGM * 2) + (p.stats['3PM'] * 3) + (p.stats.FTM || 0);
                return acc + points;
            }, 0);
            viewModeText = `(${seasonLabel} - Pro 30 Min)`;
        }
        
        const teamNameSuffix = `${viewModeText} ${gameCountText}`;

        return {
            name: `${selectedTeam} ${teamNameSuffix}`,
            players: seasonPlayers.sort((a,b) => (a.number ?? 999) - (b.number ?? 999)),
            score: displayScore
        };
    }, [gamesForTeam, selectedTeam, selectedSeason, statViewMode, roster]);
    
    const handleTeamSelect = (teamName: string) => {
        setSelectedTeam(teamName);
        const params = new URLSearchParams(window.location.search);
        params.set('view', 'seasonStats');
        params.set('team', teamName);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    };

    const handleExportXls = () => {
        if (!displayData) return;
        exportSeasonToXls(displayData);
    };

    const handleExportCsv = () => {
        if (!displayData) return;
        exportSeasonToCsv(displayData);
    };

    const handleShare = () => {
        const url = `${window.location.origin}${window.location.pathname}?view=seasonStats&team=${encodeURIComponent(selectedTeam)}`;
        if (navigator.share) {
            navigator.share({
                title: `Saison-Statistiken für ${selectedTeam}`,
                text: `Schau dir die Saison-Statistiken für ${selectedTeam} an!`,
                url: url,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url).then(() => {
                alert('Link in die Zwischenablage kopiert!');
            }).catch(err => {
                console.error('Fehler beim Kopieren des Links: ', err);
                alert('Fehler beim Kopieren des Links.');
            });
        }
    };
    
      const handleSaveAsImage = () => {
        if (!statContainerRef.current || typeof html2canvas === 'undefined') {
          alert("Die Bild-Export-Funktion konnte nicht geladen werden. Bitte lade die Seite neu.");
          return;
        }
        if (isSavingImage) return;

        setIsSavingImage(true);
        const elementToCapture = statContainerRef.current;
        const originalBackgroundColor = elementToCapture.style.backgroundColor;
        elementToCapture.style.backgroundColor = '#1f2937';

        html2canvas(elementToCapture, { scale: 2, backgroundColor: '#1f2937', useCORS: true })
        .then(canvas => {
            const link = document.createElement('a');
            const fileSuffix = 
                statViewMode === 'average' ? 'pro_spiel' :
                statViewMode === 'per30min' ? 'pro_30_min' :
                'gesamt';
            link.download = `${selectedTeam}_saison_stats_${fileSuffix}.png`.replace(/ /g, '_');
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error("Fehler beim Speichern als Bild:", err);
            alert("Es ist ein Fehler beim Erstellen des Bildes aufgetreten.");
        }).finally(() => {
            elementToCapture.style.backgroundColor = originalBackgroundColor;
            setIsSavingImage(false);
        });
      };

    return (
        <>
            <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
                <div className="max-w-6xl mx-auto">
                    <header className="bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h1 className="font-teko text-4xl text-center sm:text-left">Saison-Statistiken</h1>
                                <p className="text-gray-400 text-center sm:text-left">Gesamtleistung über alle erfassten Spiele.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {availableTeams.length > 0 && (
                                    <select
                                        id="teamName"
                                        value={selectedTeam}
                                        onChange={(e) => handleTeamSelect(e.target.value)}
                                        className="bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                                    >
                                        {availableTeams.map(team => (
                                        <option key={team} value={team}>{team}</option>
                                        ))}
                                    </select>
                                )}
                                <select
                                    id="seasonSelect"
                                    value={selectedSeason}
                                    onChange={(e) => setSelectedSeason(e.target.value as Season | 'all')}
                                    className="bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                                >
                                    {SEASONS.map(s => (
                                        <option key={s} value={s}>Saison {s}</option>
                                    ))}
                                    <option value="all">Alle Saisons</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                             <div className="flex flex-wrap justify-between items-center gap-4">
                                <div className="bg-gray-700 p-1 rounded-lg flex">
                                    <button 
                                        onClick={() => setStatViewMode('total')}
                                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${statViewMode === 'total' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        Gesamt
                                    </button>
                                    <button 
                                        onClick={() => setStatViewMode('average')}
                                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${statViewMode === 'average' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        Pro Spiel
                                    </button>
                                    <button 
                                        onClick={() => setStatViewMode('per30min')}
                                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${statViewMode === 'per30min' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        Pro 30 Min
                                    </button>
                                </div>
                                <button onClick={onBack} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm font-semibold whitespace-nowrap">
                                    Zurück zur Übersicht
                                </button>
                            </div>
                            <div className="flex flex-wrap justify-start items-center gap-2">
                                {isCoach && (
                                    <button onClick={() => setShowAiAnalysis(true)} title="KI-Analyse" className="flex items-center gap-2 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-semibold">
                                        <SparklesIcon /> <span className="hidden sm:inline">KI-Analyse</span>
                                    </button>
                                )}
                                <button onClick={handleShare} title="Teilen" className="flex items-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold">
                                    <ShareIcon /> <span className="hidden sm:inline">Teilen</span>
                                </button>
                                <button onClick={handleSaveAsImage} disabled={isSavingImage} title="Als Bild speichern" className="flex items-center gap-2 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60">
                                    <PhotoIcon /> <span className="hidden sm:inline">{isSavingImage ? 'Speichern...' : 'Bild'}</span>
                                </button>
                                <button onClick={handleExportXls} title="Export als XLS" className="flex items-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold">
                                    <TableCellsIcon /> <span className="hidden sm:inline">XLS</span>
                                </button>
                                <button onClick={handleExportCsv} title="Export als CSV" className="flex items-center gap-2 py-2 px-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors text-sm font-semibold">
                                    <DocumentArrowDownIcon /> <span className="hidden sm:inline">CSV</span>
                                </button>
                            </div>
                        </div>
                    </header>
                    <main ref={statContainerRef} className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
                        {availableTeams.length > 0 && displayData && displayData.players.length > 0 ? (
                            gamesForTeam.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-gray-400">
                                        Für das Team &quot;{selectedTeam}&quot; wurden in {selectedSeason === 'all' ? 'allen Saisons' : `Saison ${selectedSeason}`} noch keine beendeten Spiele gefunden.
                                    </p>
                                </div>
                            ) : (
                                <TeamTable team={displayData} showScore={false} showPlayerNumber={false} />
                            )
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-400">
                                    {userProfile?.role === 'Spieler' && availableTeams.length === 0
                                        ? "Du wurdest noch keinem Team zugewiesen. Bitte wende dich an einen Trainer."
                                        : gamesForUser.length === 0 
                                        ? "Es wurden noch keine Spiele für dich freigegeben, um Statistiken anzuzeigen."
                                        : `Für das Team "${selectedTeam}" wurden in ${selectedSeason === 'all' ? 'allen Saisons' : `Saison ${selectedSeason}`} keine Spieler oder Spieldaten gefunden.`
                                    }
                                </p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {showAiAnalysis && displayData && (
              // Fix: Adding missing score property to the dummy opponent object to satisfy the Opponent interface requirements.
              <AiAnalysis 
                team={displayData}
                opponent={{ name: `Saison ${selectedTeam}`, score: 0 }} // Dummy-Gegner für die Analyse
                onClose={() => setShowAiAnalysis(false)}
                analysisType="season"
              />
            )}
        </>
    );
};

export default SeasonStats;