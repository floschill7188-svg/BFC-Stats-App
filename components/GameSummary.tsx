import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Team, Player, GameState, Stat, UserProfile, Season, SEASONS } from '../types';
import { TeamTable } from './StatTable';
import { exportGameToCsv, exportGameToXls } from '../utils/stats';
import { SparklesIcon, DocumentArrowDownIcon, PhotoIcon, PencilSquareIcon, TableCellsIcon, ShareIcon } from './Icons';
import PostGameStatsModal from './PostGameStatsModal';

// Deklariert html2canvas für TypeScript, da es über ein Skript-Tag geladen wird
declare const html2canvas: any;

interface GameSummaryProps {
  game: GameState;
  userProfile: UserProfile | null;
  onBackToHome: () => void;
  onAnalyze: () => void;
  onSavePostGameStats: (gameId: number, updatedPlayers: Player[]) => void;
  onSaveChanges: (updatedGame: GameState, originalGameId: number) => Promise<void>;
  onCreateNewGameNotification: (game: GameState) => Promise<void>;
}

// Helper to parse MM:SS string to decimal minutes
const parseMinutesStringToNumber = (value: string | undefined): number | undefined => {
    if (!value?.trim()) return 0; // Return 0 instead of undefined for consistency
    const parts = value.split(':');
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1] || '0', 10);

    if (isNaN(mins)) return 0;
    if (isNaN(secs)) return mins;
    
    const clampedSecs = Math.min(secs, 59);

    return mins + clampedSecs / 60;
};

const GameSummary: React.FC<GameSummaryProps> = ({ 
  game, 
  userProfile, 
  onBackToHome, 
  onAnalyze, 
  onSavePostGameStats, 
  onSaveChanges, 
  onCreateNewGameNotification
}) => {
  const statContainerRef = useRef<HTMLDivElement>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isPostGameModalOpen, setIsPostGameModalOpen] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableGame, setEditableGame] = useState<GameState | null>(null);

  const isCoach = userProfile?.role === 'Trainer' || userProfile?.role === 'CoTrainer';

  const handleStartEditMode = () => {
    setEditableGame(JSON.parse(JSON.stringify(game)));
    setIsEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditableGame(null);
  };

  const handleSaveEdit = async () => {
    if (editableGame) {
      await onSaveChanges(editableGame, game.gameId);
      setIsEditMode(false);
      onBackToHome();
    }
  };
  
  const handleOpponentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableGame(currentGame => {
        if (!currentGame) return null;
        return {
            ...currentGame,
            opponent: {
                ...currentGame.opponent,
                name: e.target.value,
            },
        };
    });
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeason = e.target.value as Season;
    setEditableGame(currentGame => {
        if (!currentGame) return null;
        return {
            ...currentGame,
            season: newSeason,
        };
    });
  };

  const handleQuickSeasonChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeason = e.target.value as Season;
    const updatedGame = { ...game, season: newSeason };
    await onSaveChanges(updatedGame, game.gameId);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableGame(currentGame => {
        if (!currentGame) return null;

        const newDateString = e.target.value; // Format: YYYY-MM-DD
        const [year, month, day] = newDateString.split('-').map(Number);

        // Preserve the original time of day, change only the date part
        const originalDate = new Date(currentGame.gameId);
        originalDate.setFullYear(year, month - 1, day); // month is 0-indexed in JS Date

        return { ...currentGame, gameId: originalDate.getTime() };
    });
  };

  const handleGameTypeChange = () => {
    setEditableGame(currentGame => {
        if (!currentGame) return null;
        return {
            ...currentGame,
            gameType: currentGame.gameType === 'away' ? 'home' : 'away',
        };
    });
  };
  
  const handleReleaseGame = () => {
    if (!game) return;
    const updatedGame = { ...game, isReleased: true };
    onSaveChanges(updatedGame, game.gameId).then(() => {
        onCreateNewGameNotification(updatedGame);
    });
  };

  const handleDirectStatChange = useCallback((playerId: number, stat: Stat, value: number | string) => {
      setEditableGame(currentGame => {
        if (!currentGame) return null;

        const newGame = JSON.parse(JSON.stringify(currentGame));
        const player = newGame.team.players.find((p: Player) => p.id === playerId);
        
        if (player) {
          let numericValue: number | undefined;

          if (stat === 'MIN' && typeof value === 'string') {
            numericValue = parseMinutesStringToNumber(value);
          } else if (typeof value === 'string') {
            numericValue = parseInt(value, 10);
          } else {
            numericValue = value;
          }

          player.stats[stat] = isNaN(numericValue as number) ? 0 : numericValue;

          // Recalculate total score based on all players' stats
          newGame.team.score = newGame.team.players.reduce((totalScore: number, p: Player) => {
              const points = (p.stats.FGM * 2) + (p.stats['3PM'] * 3) + (p.stats.FTM || 0);
              return totalScore + points;
          }, 0);
        }
        return newGame;
      });
  }, []);

  const displayedTeam = useMemo<Team>(() => {
    const sourceGame = game;
    if (selectedQuarter === null || !sourceGame.actionLog || sourceGame.actionLog.length === 0) {
        return sourceGame.team;
    }

    const quarterActions = sourceGame.actionLog.filter(a => a.quarter === selectedQuarter);

    const quarterPlayers = JSON.parse(JSON.stringify(sourceGame.team.players)).map((p: Player) => {
        p.stats.FGM = 0;
        p.stats.FGA = 0;
        p.stats['3PM'] = 0;
        p.stats['3PA'] = 0;
        p.stats.OREB = 0;
        p.stats.DREB = 0;
        p.stats.AST = 0;
        p.stats.STL = 0;
        p.stats.BLK = 0;
        p.stats.TO = 0;
        return p;
    });

    let quarterScore = 0;

    quarterActions.forEach(action => {
        const playerToUpdate = quarterPlayers.find((p: Player) => p.id === action.playerId);
        if (!playerToUpdate) return;
        
        const stat = action.stat;

        // @ts-ignore
        playerToUpdate.stats[stat] = (playerToUpdate.stats[stat] || 0) + action.value;
        
        if (stat === 'FGM') {
            playerToUpdate.stats.FGA = (playerToUpdate.stats.FGA || 0) + action.value;
            quarterScore += 2 * action.value;
        } else if (stat === '3PM') {
            playerToUpdate.stats['3PA'] = (playerToUpdate.stats['3PA'] || 0) + action.value;
            quarterScore += 3 * action.value;
        }
    });
    
    return { name: sourceGame.team.name, score: quarterScore, players: quarterPlayers };
  }, [game, selectedQuarter]);

  const handleExportCsv = () => {
    exportGameToCsv(game.team, game.opponent);
  };

  const handleExportXls = () => {
    exportGameToXls(game.team, game.opponent);
  };

  const handleSavePostGameData = (updatedPlayers: Player[]) => {
    onSavePostGameStats(game.gameId, updatedPlayers);
    setIsPostGameModalOpen(false);
  };
  
  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=summary&gameId=${game.gameId}`;
    if (navigator.share) {
        navigator.share({
            title: `Spielzusammenfassung: ${game.team.name} vs ${game.opponent.name}`,
            text: `Schau dir die Stats vom Spiel an!`,
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

    html2canvas(elementToCapture, {
        scale: 2, 
        backgroundColor: '#1f2937',
        useCORS: true,
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${game.team.name}_vs_${game.opponent.name}_stats.png`.replace(/ /g, '_');
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
  
  const quarterButtons = [
    { label: 'Gesamt', value: null },
    { label: 'Q1', value: 1 },
    { label: 'Q2', value: 2 },
    { label: 'Q3', value: 3 },
    { label: 'Q4', value: 4 },
  ];

  const { team, opponent } = editableGame || game;
  const currentSeason = (editableGame || game).season || '25/26';

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          <header className="bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h1 className="font-teko text-4xl text-center sm:text-left">
                  {isEditMode ? 'Spiel Bearbeiten' : 'Spielzusammenfassung'}
                </h1>
                {isEditMode && editableGame ? (
                  <div className="flex flex-col sm:flex-row flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">{editableGame.team.name} vs.</span>
                        <input
                          type="text"
                          value={editableGame.opponent.name}
                          onChange={handleOpponentNameChange}
                          className="bg-gray-900 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-48"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Abheften in:</span>
                        <select
                          value={editableGame.season || '25/26'}
                          onChange={handleSeasonChange}
                          className="bg-gray-900 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                        >
                          {SEASONS.map(s => (
                            <option key={s} value={s}>Saison {s}</option>
                          ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Datum:</span>
                         <input
                            type="date"
                            value={new Date(editableGame.gameId).toISOString().split('T')[0]}
                            onChange={handleDateChange}
                            className="bg-gray-900 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Ort:</span>
                        <div className="flex items-center gap-2">
                            <span className={`font-semibold ${editableGame.gameType !== 'away' ? 'text-white' : 'text-gray-500'}`}>Heim</span>
                            <label htmlFor="game-type-toggle-edit" className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="game-type-toggle-edit" className="sr-only peer" checked={editableGame.gameType === 'away'} onChange={handleGameTypeChange} />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </label>
                            <span className={`font-semibold ${editableGame.gameType === 'away' ? 'text-white' : 'text-gray-500'}`}>Auswärts</span>
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-gray-400">{team.name} vs {opponent.name}</p>
                    {isCoach ? (
                      <div className="flex items-center gap-1.5 bg-gray-900/80 px-2.5 py-1 rounded-md border border-gray-700">
                        <span className="text-xs text-gray-400">Abgeheftet in:</span>
                        <select
                          value={game.season || '25/26'}
                          onChange={handleQuickSeasonChange}
                          className="bg-transparent text-indigo-300 font-semibold text-xs focus:outline-none cursor-pointer"
                          title="Saison für dieses Spiel ändern"
                        >
                          {SEASONS.map(s => (
                            <option key={s} value={s} className="bg-gray-800 text-white">Saison {s}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-900/80 border border-indigo-500/70 text-indigo-200">
                        Saison {currentSeason}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
                 {!isEditMode && (
                    <>
                        {isCoach && (
                            <>
                                {game.isReleased ? (
                                    <div className="py-2 px-3 bg-green-900 text-green-300 rounded-lg text-sm font-semibold border border-green-700">
                                        ✓ Freigegeben
                                    </div>
                                ) : (
                                    <button onClick={handleReleaseGame} title="Spiel für Spieler freigeben" className="flex items-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold">
                                        Für Spieler freigeben
                                    </button>
                                )}
                                <button onClick={handleStartEditMode} title="Spiel bearbeiten" className="flex items-center gap-2 py-2 px-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-semibold">
                                    <PencilSquareIcon /> <span className="hidden sm:inline">Bearbeiten</span>
                                </button>
                                <button onClick={() => setIsPostGameModalOpen(true)} title="Kampfgericht-Stats Eintragen" className="flex items-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold">
                                    <PencilSquareIcon /> <span className="hidden sm:inline">Stats Eintragen</span>
                                </button>
                                <button onClick={onAnalyze} title="KI-Analyse" className="flex items-center gap-2 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-semibold">
                                    <SparklesIcon /> <span className="hidden sm:inline">KI-Analyse</span>
                                </button>
                            </>
                        )}
                        <button onClick={handleShare} title="Teilen" className="flex items-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold">
                            <ShareIcon /> <span className="hidden sm:inline">Teilen</span>
                        </button>
                        <button onClick={handleSaveAsImage} disabled={isSavingImage} title="Als Bild speichern" className="flex items-center gap-2 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60">
                            <PhotoIcon /> <span className="hidden sm:inline">{isSavingImage ? 'Speichern...' : 'Als Bild'}</span>
                        </button>
                        <button onClick={handleExportXls} title="Export als XLS" className="flex items-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold">
                            <TableCellsIcon /> <span className="hidden sm:inline">XLS</span>
                        </button>
                        <button onClick={handleExportCsv} title="Export als CSV" className="flex items-center gap-2 py-2 px-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors text-sm font-semibold">
                            <DocumentArrowDownIcon /> <span className="hidden sm:inline">CSV</span>
                        </button>
                    </>
                 )}
                 <button onClick={isEditMode ? handleCancelEdit : onBackToHome} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm font-semibold">
                    {isEditMode ? 'Abbrechen' : 'Zurück zur Übersicht'}
                </button>
                {isEditMode && (
                    <button onClick={handleSaveEdit} className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold">
                        Speichern & Beenden
                    </button>
                )}
              </div>
            </div>
          </header>
          
          {!isEditMode && (
            <div className="bg-gray-800 rounded-xl shadow-lg mb-4 p-2">
                <div className="bg-gray-700 p-1 rounded-lg flex flex-wrap justify-center gap-1">
                {quarterButtons.map(btn => (
                    <button
                    key={btn.label}
                    onClick={() => setSelectedQuarter(btn.value)}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${selectedQuarter === btn.value ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                    >
                    {btn.label}
                    </button>
                ))}
                </div>
            </div>
          )}

          <main ref={statContainerRef} className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            {isEditMode && editableGame ? (
                <TeamTable
                  team={editableGame.team}
                  isEditable={true}
                  onStatChange={handleDirectStatChange}
                  showScore={true}
                />
            ) : (
                <TeamTable team={displayedTeam} showScore={true} />
            )}
          </main>
        </div>
      </div>
      
      {isPostGameModalOpen && (
        <PostGameStatsModal 
          isOpen={isPostGameModalOpen}
          onClose={() => setIsPostGameModalOpen(false)}
          team={game.team}
          onSave={handleSavePostGameData}
        />
      )}
    </>
  );
};

export default GameSummary;
