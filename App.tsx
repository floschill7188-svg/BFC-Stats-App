
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, writeBatch, deleteDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

import { 
    View, 
    GameState, 
    MasterRosterPlayer, 
    UserProfile, 
    Player, 
    Stat, 
    ActionLogEntry,
    PlayerSubgroup
} from './types';
import { auth, db } from './firebase';
import { initialRoster } from './utils/rosterStorage';

import LoginScreen from './components/LoginScreen';
import Home from './components/Home';
import GameSetup from './components/GameSetup';
import TournamentSetup from './components/TournamentSetup';
import Scoreboard from './components/Scoreboard';
import TeamDisplay from './components/TeamDisplay';
import ActionControl from './components/ActionControl';
import GameSummary from './components/GameSummary';
import SeasonStats from './components/SeasonStats';
import BoxScore from './components/BoxScore';
import AiAnalysis from './components/AiAnalysis';
import ManageRosterModal from './components/ManageRosterModal';
import ChangelogModal from './components/ChangelogModal';
import ToastNotification, { ToastType } from './components/ToastNotification';
import AccountManagement from './components/AccountManagement';
import UserManagement from './components/UserManagement';
import BeerList from './components/BeerList';
import AssistModal from './components/AssistModal';
import FoulPenaltyModal from './components/FoulPenaltyModal';

const ROSTER_DOC_PATH = 'roster-v2';

const App: React.FC = () => {
    const [view, setView] = useState<View>('loading');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [games, setGames] = useState<GameState[]>([]); 
    const [unsyncedGames, setUnsyncedGames] = useState<GameState[]>([]); 
    const [roster, setRoster] = useState<MasterRosterPlayer[]>([]);
    const [cloudInProgressGame, setCloudInProgressGame] = useState<GameState | null>(null);
    const [activeGame, setActiveGame] = useState<GameState | null>(null); 
    
    // Aktions-States
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [selectedAction, setSelectedAction] = useState<{ stat: Stat; missType?: '2P' | '3P' | 'FT' } | null>(null);

    const [assistPrompt, setAssistPrompt] = useState<{ scorerId: number; shotType: 'FGM' | '3PM' } | null>(null);
    const [foulNotification, setFoulNotification] = useState<Player | null>(null);
    const [gameForSummary, setGameForSummary] = useState<GameState | null>(null);
    const [isBoxScoreOpen, setIsBoxScoreOpen] = useState(false);
    const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false);
    const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
    const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
    const [analysisTarget, setAnalysisTarget] = useState<GameState | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);
    
    useEffect(() => {
        let interval: any;
        if (view === 'game' && activeGame?.isTournament && !activeGame.isPaused) {
            interval = setInterval(() => {
                setActiveGame(prev => {
                    if (!prev || prev.gameTime! >= 600) return prev;
                    const newGameTime = (prev.gameTime || 0) + 1;
                    const updatedPlayers = prev.team.players.map(player => {
                        if (player.onCourt) {
                            return {
                                ...player,
                                stats: {
                                    ...player.stats,
                                    MIN: (player.stats.MIN || 0) + (1 / 60)
                                }
                            };
                        }
                        return player;
                    });
                    return { ...prev, gameTime: newGameTime, team: { ...prev.team, players: updatedPlayers } };
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [view, activeGame?.isTournament, activeGame?.isPaused]);

    const handleDemoLogin = () => {
        const demoUser = {
            uid: 'demo-trainer-florian',
            email: 'florian@bfc-stats.de',
            displayName: 'Coach Florian',
        } as User;
        const demoProfile: UserProfile = {
            uid: 'demo-trainer-florian',
            email: 'florian@bfc-stats.de',
            displayName: 'Coach Florian',
            role: 'Trainer',
            playerTeams: ['BFC U18', 'BFC Herren 1'],
        };
        setUser(demoUser);
        setUserProfile(demoProfile);
        setView('home');
        showToast("Im Demo-Modus als Trainer angemeldet!", "info");
    };

    useEffect(() => {
        let unsubscribeProfile: () => void = () => {};
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            unsubscribeProfile();
            if (firebaseUser) {
                setUser(firebaseUser);
                const userRef = doc(db, "users", firebaseUser.uid);
                unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile({ uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
                        if (view === 'loading' || view === 'login') setView('home');
                    } else {
                        // Benutzer-Dokument in Firestore anlegen, falls noch nicht vorhanden
                        const defaultProfile: Omit<UserProfile, 'uid'> = {
                            email: firebaseUser.email || '',
                            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Trainer',
                            role: 'Trainer',
                            playerTeams: ['BFC U18', 'BFC Herren 1', 'BFC Herren 2'],
                        };
                        try {
                            await setDoc(userRef, defaultProfile);
                        } catch (e) {
                            console.warn("Could not save initial profile to Firestore:", e);
                        }
                        setUserProfile({ uid: firebaseUser.uid, ...defaultProfile });
                        if (view === 'loading' || view === 'login') setView('home');
                    }
                }, (error) => {
                    console.error("User profile snapshot error:", error);
                    const fallbackProfile: UserProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        displayName: firebaseUser.displayName || 'Trainer',
                        role: 'Trainer',
                    };
                    setUserProfile(fallbackProfile);
                    if (view === 'loading' || view === 'login') setView('home');
                });
            } else {
                setUser(null); setUserProfile(null); setView('login');
            }
        });
        return () => { unsubscribeAuth(); unsubscribeProfile(); };
    }, []); 

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'games'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firestoreGames = snapshot.docs.map(doc => {
                const g = doc.data() as GameState;
                return { ...g, season: g.season || '25/26' };
            });
            const inProgressGame = firestoreGames.find(g => g.status === 'inprogress' && g.coachId === user.uid);
            setCloudInProgressGame(inProgressGame || null);
            setGames(firestoreGames.filter(g => g.status === 'finished'));
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const rosterRef = doc(db, 'app-data', ROSTER_DOC_PATH);
        const unsubscribe = onSnapshot(rosterRef, async (docSnap) => {
            if (docSnap.exists()) {
                const dataPlayers = (docSnap.data().players || []) as MasterRosterPlayer[];
                let needsUpdate = false;
                // Alle bisherigen Spieler der Saison 25/26 zuordnen
                const updatedPlayers = dataPlayers.map(p => {
                    const currentSeasons = new Set<Season>(p.seasons || []);
                    if (!currentSeasons.has('25/26')) {
                        currentSeasons.add('25/26');
                        needsUpdate = true;
                    }
                    return { ...p, seasons: Array.from(currentSeasons) };
                });
                if (needsUpdate) {
                    try {
                        await setDoc(rosterRef, { players: updatedPlayers }, { merge: true });
                    } catch (e) {
                        console.warn("Could not auto-update roster seasons in Firestore:", e);
                    }
                }
                setRoster(updatedPlayers);
            } else {
                try {
                    await setDoc(rosterRef, { players: initialRoster });
                } catch (e) {
                    console.warn("Could not seed initial roster:", e);
                }
                setRoster(initialRoster);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStat = useCallback((playerId: number, stat: Stat, value: number) => {
        if (stat === ('onCourt' as Stat)) {
            setActiveGame(prev => {
                if (!prev) return null;
                const newPlayers = prev.team.players.map(p => p.id === playerId ? { ...p, onCourt: !!value } : p);
                const updated = { ...prev, team: { ...prev.team, players: newPlayers } };
                setDoc(doc(db, 'games', updated.gameId.toString()), updated);
                return updated;
            });
            return;
        }
        // Falls Treffer: Assist-Modal öffnen, bevor Stats geschrieben werden
        if ((stat === 'FGM' || stat === '3PM') && value > 0) {
            setAssistPrompt({ scorerId: playerId, shotType: stat });
            return;
        }
        setActiveGame(prevGame => {
            if (!prevGame) return null;
            const player = prevGame.team.players.find(p => p.id === playerId);
            if (!player) return prevGame;
            let newScore = prevGame.team.score;
            let newOpponentScore = prevGame.opponent.score || 0;
            const newPlayers = prevGame.team.players.map(p => {
                if (p.id === playerId) {
                    const newStats = { ...p.stats };
                    if (prevGame.isTournament && stat === 'PF' && value > 0) {
                        if ((newStats.PF || 0) >= 2) { 
                            newOpponentScore += 2;
                            setFoulNotification(p);
                        }
                    }
                    (newStats[stat] as number) = (newStats[stat] || 0) + value;
                    if (stat === 'FTM' && value > 0) {
                        newStats.FTA = (newStats.FTA || 0) + value;
                        newScore += value;
                    }
                    if (stat === 'FGM' && value > 0) {
                        newStats.FGA = (newStats.FGA || 0) + value;
                        newScore += 2;
                    }
                    if (stat === '3PM' && value > 0) {
                        newStats['3PA'] = (newStats['3PA'] || 0) + value;
                        newScore += 3;
                    }
                    return { ...p, stats: newStats };
                }
                return p;
            });
            const updatedGame = { 
                ...prevGame, 
                team: { ...prevGame.team, players: newPlayers, score: newScore }, 
                opponent: { ...prevGame.opponent, score: newOpponentScore },
                actionLog: [...prevGame.actionLog, { id: Date.now(), playerId, stat, value, description: `${player.name}: +${value} ${stat}`, quarter: prevGame.quarter }] 
            };
            setDoc(doc(db, 'games', updatedGame.gameId.toString()), updatedGame);
            return updatedGame;
        });
        showToast("Statistik erfasst!");
    }, [showToast]);

    const handlePlayerSelect = (playerId: number) => {
        if (selectedAction) {
            handleUpdateStat(playerId, selectedAction.stat, 1);
            setSelectedAction(null);
            setSelectedPlayerId(null);
        } else {
            setSelectedPlayerId(prev => prev === playerId ? null : playerId);
        }
    };

    const handleStatAction = (stat: Stat, missType?: '2P' | '3P' | 'FT') => {
        if (selectedPlayerId !== null) {
            handleUpdateStat(selectedPlayerId, stat, 1);
            setSelectedPlayerId(null);
            setSelectedAction(null);
        } else {
            setSelectedAction({ stat, missType });
        }
    };

    const renderContent = () => {
        if (view === 'loading' || !user || !userProfile) {
             if (view === 'login') return <LoginScreen onDemoLogin={handleDemoLogin} />;
            return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div></div>;
        }

        switch (view) {
            case 'home': return <Home userProfile={userProfile} onStartNewGame={() => setView('gameSetup')} onManageRoster={() => setIsRosterModalOpen(true)} onViewSeasonStats={() => setView('seasonStats')} onManageAccount={() => setView('account')} onManageUsers={() => setView('userManagement')} onViewBeerList={() => setView('beerList')} inProgressGame={cloudInProgressGame} onResumeGame={() => { setView('game'); setActiveGame(cloudInProgressGame); }} completedGames={games} unsyncedGames={unsyncedGames} onSyncGames={() => {}} roster={roster} onViewGameSummary={(g) => { setGameForSummary(g); setView('summary'); }} onDeleteGame={async (id) => { await deleteDoc(doc(db, 'games', id.toString())); }} onImportGame={() => {}} onNavigate={(v) => setView(v)} showToast={showToast} />;
            case 'gameSetup': return <GameSetup userProfile={userProfile} onSetup={(t, o, p, gt, s) => { const gp: Player[] = p.map(player => ({ ...player, stats: { FGM: 0, FGA: 0, '3PM': 0, '3PA': 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TO: 0, FTM: 0, FTA: 0, PF: 0 } })); const ng: GameState = { gameId: Date.now(), status: 'inprogress', season: s || '25/26', team: { name: t, players: gp, score: 0 }, opponent: { name: o || 'Gegner', score: 0 }, quarter: 1, actionLog: [], gameType: gt, coachId: user?.uid }; setDoc(doc(db, 'games', ng.gameId.toString()), ng); setActiveGame(ng); setView('game'); }} roster={roster} onSaveRoster={async (nr) => await setDoc(doc(db, 'app-data', ROSTER_DOC_PATH), { players: nr })} onCancel={() => setView('home')} />;
            case 'tournamentSetup': return <TournamentSetup userProfile={userProfile} onSetup={(t, o, p) => { const gp: Player[] = p.map((player, idx) => ({ ...player, onCourt: idx < 5, stats: { FGM: 0, FGA: 0, '3PM': 0, '3PA': 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TO: 0, FTM: 0, FTA: 0, PF: 0, MIN: 0 } })); const ng: GameState = { gameId: Date.now(), status: 'inprogress', season: '25/26', team: { name: t, players: gp, score: 0 }, opponent: { name: o, score: 0 }, quarter: 1, actionLog: [], coachId: user?.uid, isTournament: true, gameTime: 0, isPaused: true }; setDoc(doc(db, 'games', ng.gameId.toString()), ng); setActiveGame(ng); setView('game'); }} roster={roster} onCancel={() => setView('home')} />;
            case 'game':
                if (!activeGame) return null;
                return (
                    <div className="min-h-screen lg:h-screen w-full bg-gray-900 text-gray-100 p-2 md:p-4 lg:overflow-hidden">
                        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-4 md:gap-6">
                            {/* LINKE SPALTE: Steuerung */}
                            <div className="flex flex-col gap-4 h-full min-h-0">
                                <Scoreboard 
                                    team={activeGame.team} 
                                    activeGame={activeGame} 
                                    isUndoable={activeGame.actionLog.length > 0} 
                                    isTrainer={true} 
                                    onNextQuarter={() => setActiveGame(p => p ? ({...p, quarter: p.quarter + 1}) : null)} 
                                    onShowBoxScore={() => setIsBoxScoreOpen(true)} 
                                    onUndo={() => {}} 
                                    onEndGame={() => { setGameForSummary({...activeGame, status: 'finished'}); setDoc(doc(db, 'games', activeGame.gameId.toString()), {...activeGame, status: 'finished'}); setView('summary'); setActiveGame(null); }} 
                                    onCancelGame={() => { deleteDoc(doc(db, 'games', activeGame.gameId.toString())); setView('home'); setActiveGame(null); }} 
                                    onManageRoster={() => setIsRosterModalOpen(true)} 
                                    onShowChangelog={() => setIsChangelogModalOpen(true)} 
                                    onSaveGame={() => setDoc(doc(db, 'games', activeGame.gameId.toString()), activeGame)}
                                    onTogglePause={() => setActiveGame(p => p ? ({...p, isPaused: !p.isPaused}) : null)}
                                    onUpdateGameTime={(s) => setActiveGame(p => p ? ({...p, gameTime: s}) : null)}
                                />
                                
                                <div className="flex-grow min-h-0 overflow-y-auto pr-1 flex flex-col gap-4">
                                    <ActionControl 
                                        onStatAction={handleStatAction} 
                                        selectedAction={selectedAction} 
                                        disabled={false} 
                                    />

                                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mt-auto">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</h3>
                                        <p className={`text-lg font-bold transition-all ${selectedPlayerId || selectedAction ? 'text-orange-400 scale-105' : 'text-gray-400'}`}>
                                            {selectedPlayerId 
                                                ? `Aktion für ${activeGame.team.players.find(p => p.id === selectedPlayerId)?.name} wählen...` 
                                                : selectedAction 
                                                ? `Spieler für ${selectedAction.stat} wählen...` 
                                                : "Bereit für Eingabe..."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* RECHTE SPALTE: Spielerliste */}
                            <div className="h-full min-h-0 overflow-hidden">
                                <TeamDisplay 
                                    team={activeGame.team} 
                                    onPlayerSelect={handlePlayerSelect}
                                    selectedPlayerId={selectedPlayerId}
                                    disabled={false} 
                                    isTournament={activeGame.isTournament} 
                                    onUpdateStat={handleUpdateStat}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'summary':
                if (!gameForSummary) return null;
                return <GameSummary 
                    game={gameForSummary} 
                    userProfile={userProfile} 
                    onBackToHome={() => setView('home')} 
                    onAnalyze={() => { setAnalysisTarget(gameForSummary); setIsAiAnalysisOpen(true); }} 
                    onSavePostGameStats={async (gameId, updatedPlayers) => {
                        const updatedGame = {
                            ...gameForSummary,
                            team: {
                                ...gameForSummary.team,
                                players: updatedPlayers
                            }
                        };
                        setGameForSummary(updatedGame);
                        await setDoc(doc(db, 'games', gameId.toString()), updatedGame);
                        showToast("Statistiken gespeichert!");
                    }} 
                    onSaveChanges={async (ug, origId) => { 
                        setGameForSummary(ug);
                        if (origId && origId !== ug.gameId) {
                            await deleteDoc(doc(db, 'games', origId.toString()));
                        }
                        await setDoc(doc(db, 'games', ug.gameId.toString()), ug); 
                        showToast("Spiel & Saison gespeichert!");
                    }} 
                    onCreateNewGameNotification={async () => {}}
                />;
            case 'seasonStats': return <SeasonStats completedGames={games} roster={roster} onBack={() => setView('home')} userProfile={userProfile} />;
            case 'account': return <AccountManagement currentUser={user} onBack={() => setView('home')} showToast={showToast} />;
            case 'userManagement': return <UserManagement currentUser={userProfile} onBack={() => setView('home')} showToast={showToast} roster={roster}/>;
            case 'beerList': return <BeerList userProfile={userProfile} allUsers={allUsers} onBack={() => setView('home')} showToast={showToast} roster={roster} />;
            default: return null;
        }
    };

    return (
        <>
            {renderContent()}
            {toast && <ToastNotification message={toast.message} type={toast.type} />}
            {isRosterModalOpen && (<ManageRosterModal isOpen={isRosterModalOpen} onClose={() => setIsRosterModalOpen(false)} roster={roster} onSaveRoster={async (nr) => await setDoc(doc(db, 'app-data', ROSTER_DOC_PATH), { players: nr })} activePlayerIds={activeGame ? new Set(activeGame.team.players.map(p => p.id)) : undefined} currentGameTeamName={activeGame?.team.name} onTogglePlayerInGame={activeGame ? (id) => handleUpdateStat(id, 'onCourt' as Stat, activeGame.team.players.find(p => p.id === id)?.onCourt ? 0 : 1) : undefined} />)}
            {isBoxScoreOpen && activeGame && (<BoxScore team={activeGame.team} opponent={activeGame.opponent} onClose={() => setIsBoxScoreOpen(false)} onAnalyze={() => { setIsBoxScoreOpen(false); setAnalysisTarget(activeGame); setIsAiAnalysisOpen(true); }} />)}
            {isAiAnalysisOpen && analysisTarget && (<AiAnalysis team={analysisTarget.team} opponent={analysisTarget.opponent} onClose={() => setIsAiAnalysisOpen(false)} analysisType="game" />)}
            {isChangelogModalOpen && activeGame && (<ChangelogModal isOpen={isChangelogModalOpen} onClose={() => setIsChangelogModalOpen(false)} actions={activeGame.actionLog} isTrainer={true} onDeleteAction={() => {}} />)}
            {assistPrompt && (
                <AssistModal
                    onSelectAssist={(id) => {
                        if (!assistPrompt) return;
                        setActiveGame(prev => {
                            if (!prev) return null;
                            const { scorerId, shotType } = assistPrompt;
                            let newScore = prev.team.score;
                            const newPlayers = prev.team.players.map(p => {
                                if (p.id === scorerId) {
                                    const ns = { ...p.stats };
                                    // Stats für den Scorer aktualisieren
                                    if (shotType === 'FGM') { 
                                        ns.FGM++; 
                                        ns.FGA++; 
                                        newScore += 2; 
                                    } else if (shotType === '3PM') { 
                                        ns['3PM']++; 
                                        ns['3PA']++; 
                                        newScore += 3; 
                                    }
                                    return { ...p, stats: ns };
                                }
                                // Falls ein Assistgeber gewählt wurde
                                if (id && p.id === id) {
                                    return { ...p, stats: { ...p.stats, AST: (p.stats.AST || 0) + 1 } };
                                }
                                return p;
                            });
                            const ug = { ...prev, team: { ...prev.team, players: newPlayers, score: newScore } };
                            setDoc(doc(db, 'games', ug.gameId.toString()), ug);
                            return ug;
                        });
                        setAssistPrompt(null);
                        showToast("Korb & Assist gespeichert!");
                    }}
                    scorer={activeGame?.team.players.find(p => p.id === assistPrompt.scorerId)}
                    // Hier fixen wir den Bug: onCourt !== false bei Turnieren, true bei normalen Spielen
                    potentialAssisters={activeGame?.team.players.filter(p => p.id !== assistPrompt.scorerId && (activeGame.isTournament ? p.onCourt !== false : true)) || []}
                />
            )}
            {foulNotification && (<FoulPenaltyModal player={foulNotification} onConfirm={() => setFoulNotification(null)} />)}
        </>
    );
};

export default App;
