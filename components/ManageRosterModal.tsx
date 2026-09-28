
import React, { useState, useRef, useEffect } from 'react';
import { MasterRosterPlayer, Season, SEASONS } from '../types';
import { XMarkIcon, ArrowUpTrayIcon, QuestionMarkCircleIcon, DocumentArrowDownIcon } from './Icons';
import { exportRosterToXls } from '../utils/stats';

// Deklariert XLSX für TypeScript, da es über ein Skript-Tag geladen wird
declare const XLSX: any;

interface ManageRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: MasterRosterPlayer[];
  onSaveRoster: (newRoster: MasterRosterPlayer[]) => void;
  activePlayerIds?: Set<number>;
  currentGameTeamName?: string;
  onTogglePlayerInGame?: (playerId: number) => void;
}

// Nur die regulären Teams anzeigen
const TEAMS = ["BFC U18", "BFC Herren 1", "BFC Herren 2"];

const ManageRosterModal: React.FC<ManageRosterModalProps> = ({ isOpen, onClose, roster, onSaveRoster, activePlayerIds, currentGameTeamName, onTogglePlayerInGame }) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [assignedTeams, setAssignedTeams] = useState<Set<string>>(new Set());
  const [assignedSeasons, setAssignedSeasons] = useState<Set<Season>>(new Set<Season>(['25/26']));
  const [editingPlayer, setEditingPlayer] = useState<MasterRosterPlayer | null>(null);
  const [error, setError] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [teamToBulkAssign, setTeamToBulkAssign] = useState<string>(TEAMS[0]);
  const [seasonToBulkAssign, setSeasonToBulkAssign] = useState<Season>(SEASONS[0]);
  const [bulkActionType, setBulkActionType] = useState<'team' | 'season'>('season');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const isGameMode = !!onTogglePlayerInGame;
  const [filterTeam, setFilterTeam] = useState<string | null>(isGameMode ? (TEAMS.includes(currentGameTeamName || '') ? currentGameTeamName || null : null) : null);
  const [filterSeason, setFilterSeason] = useState<Season | null>(null);
  
  const rosterForDisplay = roster.filter(p => {
    if (filterTeam && !p.teams?.includes(filterTeam)) return false;
    if (filterSeason) {
      const playerSeasons = p.seasons && p.seasons.length > 0 ? p.seasons : ['25/26'];
      if (!playerSeasons.includes(filterSeason)) return false;
    }
    return true;
  });

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedPlayerIds(new Set());
  }, [filterTeam, filterSeason]);

  // Effect to manage the indeterminate state of the "select all" checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
        const numSelected = selectedPlayerIds.size;
        const numDisplayed = rosterForDisplay.length;
        selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numDisplayed;
    }
  }, [selectedPlayerIds, rosterForDisplay]);

  if (!isOpen) return null;
  
  const sortRoster = (rosterToSort: MasterRosterPlayer[]): MasterRosterPlayer[] => {
    return [...rosterToSort].sort((a, b) => a.name.localeCompare(b.name));
  };

  const resetForm = () => {
    setNewPlayerName('');
    setAssignedTeams(new Set<string>());
    setAssignedSeasons(new Set<Season>(['25/26']));
    setError('');
    setEditingPlayer(null);
  };
  
  const closeModal = () => {
    resetForm();
    onClose();
  };

  const handleTeamAssignment = (teamName: string) => {
    const newAssignedTeams = new Set(assignedTeams);
    if (newAssignedTeams.has(teamName)) {
      newAssignedTeams.delete(teamName);
    } else {
      newAssignedTeams.add(teamName);
    }
    setAssignedTeams(newAssignedTeams);
  };

  const handleSeasonAssignment = (season: Season) => {
    const newAssignedSeasons = new Set(assignedSeasons);
    if (newAssignedSeasons.has(season)) {
      newAssignedSeasons.delete(season);
    } else {
      newAssignedSeasons.add(season);
    }
    setAssignedSeasons(newAssignedSeasons);
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlayer) handleUpdatePlayer();
    else handleAddPlayer();
  };

  const handleAddPlayer = () => {
    setError('');
    if (!newPlayerName.trim()) {
        setError('Ein Name ist erforderlich.');
        return;
    }
    
    const finalTeams = new Set<string>(assignedTeams);
    if (filterTeam && !finalTeams.has(filterTeam)) {
      finalTeams.add(filterTeam);
    }

    const finalSeasons = new Set<Season>(assignedSeasons);
    if (filterSeason && !finalSeasons.has(filterSeason)) {
      finalSeasons.add(filterSeason);
    }
    if (finalSeasons.size === 0) {
      finalSeasons.add('25/26');
    }

    const maxId = roster.reduce((max, p) => Math.max(p.id, max), 0);
    const newPlayer: MasterRosterPlayer = {
      id: maxId + 1,
      name: newPlayerName.trim(),
      teams: Array.from(finalTeams),
      seasons: Array.from(finalSeasons),
    };
    
    const newRoster = sortRoster([...roster, newPlayer]);
    onSaveRoster(newRoster);
    resetForm();
  };

  const handleUpdatePlayer = () => {
    if (!editingPlayer) return;
    setError('');
    if (!newPlayerName.trim()) {
        setError('Ein Name ist erforderlich.');
        return;
    }

    const finalSeasons = Array.from(assignedSeasons);
    const updatedRoster = roster.map(p => 
      p.id === editingPlayer.id ? { 
        ...p, 
        name: newPlayerName.trim(), 
        teams: Array.from(assignedTeams),
        seasons: finalSeasons.length > 0 ? finalSeasons : ['25/26'] as Season[]
      } : p
    );
    onSaveRoster(sortRoster(updatedRoster));
    resetForm();
  };

  const startEditing = (player: MasterRosterPlayer) => {
    setEditingPlayer(player);
    setNewPlayerName(player.name);
    setAssignedTeams(new Set(player.teams || []));
    setAssignedSeasons(new Set(player.seasons && player.seasons.length > 0 ? player.seasons : ['25/26'] as Season[]));
    setError('');
  };

  const cancelEditing = () => {
    resetForm();
  };

  const handleDeletePlayer = (playerId: number) => {
    onSaveRoster(roster.filter(p => p.id !== playerId));
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let playersAdded = 0;
        let playersUpdated = 0;
        let maxId = roster.reduce((max, p) => Math.max(p.id, max), 0);

        const rosterMap = new Map<string, MasterRosterPlayer>(
            roster.map(p => [p.name.trim().toLowerCase(), { ...p }])
        );

        json.forEach((row, index) => {
          if (index === 0) return; // Skip header row
          const name = row[0]?.toString().trim();
          
          if (!name) return;

          const assignedTeamsFromImport = new Set<string>();
          [row[1], row[2], row[3]].forEach(cellValue => {
              let teamName = cellValue?.toString().trim();
              if (teamName) {
                  const lowerTeamName = teamName.toLowerCase();
                  if (lowerTeamName === 'u18') teamName = 'BFC U18';
                  else if (lowerTeamName === 'herren 1') teamName = 'BFC Herren 1';
                  else if (lowerTeamName === 'herren 2') teamName = 'BFC Herren 2';
                  assignedTeamsFromImport.add(teamName);
              }
          });

          const key = name.toLowerCase();
          const existingPlayer = rosterMap.get(key);

          if (existingPlayer) {
            const combinedTeams = new Set(existingPlayer.teams || []);
            assignedTeamsFromImport.forEach(team => combinedTeams.add(team));
            existingPlayer.teams = Array.from(combinedTeams);
            if (!existingPlayer.seasons || existingPlayer.seasons.length === 0) {
              existingPlayer.seasons = ['25/26'];
            }
            rosterMap.set(key, existingPlayer);
            playersUpdated++;
          } else {
            const newPlayer: MasterRosterPlayer = {
              id: ++maxId,
              name,
              teams: Array.from(assignedTeamsFromImport),
              seasons: ['25/26'],
            };
            rosterMap.set(key, newPlayer);
            playersAdded++;
          }
        });
        
        const newRoster = sortRoster(Array.from(rosterMap.values()));
        onSaveRoster(newRoster);

        if(playersAdded > 0 || playersUpdated > 0) {
            alert(`Kader importiert: ${playersAdded} Spieler hinzugefügt, ${playersUpdated} Spieler aktualisiert.`);
        } else {
             alert("Keine neuen Spieler zum Importieren gefunden.");
        }

      } catch (err) {
        console.error("Fehler beim Verarbeiten der Excel-Datei:", err);
        alert("Ein Fehler ist beim Verarbeiten der Datei aufgetreten.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };
    
  const handleToggleSelection = (playerId: number) => {
    const newSelection = new Set(selectedPlayerIds);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayerIds(newSelection);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPlayerIds(new Set(rosterForDisplay.map(p => p.id)));
    } else {
      setSelectedPlayerIds(new Set());
    }
  };
  
  const handleBulkAssignment = () => {
    if (selectedPlayerIds.size === 0) return;

    const updatedRoster = roster.map(player => {
      if (selectedPlayerIds.has(player.id)) {
        if (bulkActionType === 'team') {
          const newTeams = new Set(player.teams || []);
          newTeams.add(teamToBulkAssign);
          return { ...player, teams: Array.from(newTeams) };
        } else {
          const newSeasons = new Set<Season>(player.seasons || ['25/26']);
          newSeasons.add(seasonToBulkAssign);
          return { ...player, seasons: Array.from(newSeasons) };
        }
      }
      return player;
    });

    onSaveRoster(sortRoster(updatedRoster));
    setSelectedPlayerIds(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold font-teko">Aufstellung Verwalten</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => exportRosterToXls(roster)}
                    title="Kader als Excel exportieren"
                    className="flex items-center gap-2 py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors text-sm font-semibold">
                    <DocumentArrowDownIcon /> <span className="hidden sm:inline">Exportieren</span>
                </button>
                <button onClick={handleImportClick} title="Aus Excel importieren" className="flex items-center gap-2 py-2 px-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors text-sm font-semibold">
                    <ArrowUpTrayIcon /> <span className="hidden sm:inline">Importieren</span>
                </button>
                <div className="relative group">
                    <div className="text-gray-400 hover:text-white cursor-help">
                        <QuestionMarkCircleIcon />
                    </div>
                    <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-lg shadow-lg text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        <h4 className="font-bold text-white mb-2">Excel Import Anleitung</h4>
                        <ul className="list-none space-y-1 text-left">
                            <li><strong className="font-semibold text-orange-400">Spalte A:</strong> Spielername</li>
                            <li><strong className="font-semibold text-orange-400">Spalte B-D:</strong> Teamnamen</li>
                        </ul>
                    </div>
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <XMarkIcon />
            </button>
          </div>
        </header>
        <main className="p-6 overflow-y-auto relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label htmlFor="teamFilter" className="block text-sm font-medium text-gray-300 mb-1">Team filtern</label>
                <select
                  id="teamFilter"
                  value={filterTeam ?? ''}
                  onChange={(e) => setFilterTeam(e.target.value || null)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">Alle Teams</option>
                  {TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="seasonFilter" className="block text-sm font-medium text-gray-300 mb-1">Saison filtern</label>
                <select
                  id="seasonFilter"
                  value={filterSeason ?? ''}
                  onChange={(e) => setFilterSeason((e.target.value as Season) || null)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">Alle Saisons</option>
                  {SEASONS.map(s => (
                    <option key={s} value={s}>Saison {s}</option>
                  ))}
                </select>
              </div>
          </div>
          
           {!isGameMode && (
             <div className="flex items-center gap-3 mb-2 px-1 text-sm text-gray-300">
                <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={rosterForDisplay.length > 0 && selectedPlayerIds.size === rosterForDisplay.length}
                    ref={selectAllCheckboxRef}
                    className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500"
                />
                <label>Alle auswählen ({rosterForDisplay.length})</label>
            </div>
           )}
          
          <div className="space-y-3">
            {sortRoster(rosterForDisplay).map(player => {
              const isActive = activePlayerIds?.has(player.id);
              const playerSeasons = player.seasons && player.seasons.length > 0 ? player.seasons : (['25/26'] as Season[]);
              return (
                <div key={player.id} className={`flex items-center justify-between bg-gray-700/50 p-2 rounded-lg transition-all ${isActive && isGameMode ? 'border-l-4 border-orange-500' : ''}`}>
                   <div className="flex items-center gap-3 flex-grow">
                      {!isGameMode && (
                        <input
                            type="checkbox"
                            checked={selectedPlayerIds.has(player.id)}
                            onChange={() => handleToggleSelection(player.id)}
                            className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500 ml-1 shrink-0"
                        />
                      )}
                      <div className="flex-grow">
                        <p className="font-medium text-white">{player.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                          {player.teams?.map(team => (
                              <span key={team} className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">{team}</span>
                          ))}
                          {playerSeasons.map(s => (
                              <span key={s} className="text-xs bg-indigo-900/80 border border-indigo-600/70 text-indigo-200 px-2 py-0.5 rounded-full font-medium">
                                Saison {s}
                              </span>
                          ))}
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-2 shrink-0">
                      {isGameMode && onTogglePlayerInGame ? (
                        <button 
                          onClick={() => onTogglePlayerInGame(player.id)}
                          className={`px-3 py-1 text-sm rounded-md font-semibold ${isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                          {isActive ? 'Entfernen' : 'Hinzufügen'}
                        </button>
                      ) : (
                        <>
                          <button onClick={() => startEditing(player)} className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 rounded-md">Bearbeiten</button>
                          <button onClick={() => handleDeletePlayer(player.id)} className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-md">Löschen</button>
                        </>
                      )}
                   </div>
                </div>
              );
            })}
            {rosterForDisplay.length === 0 && (
                <p className="text-center text-gray-400 py-4">
                    {filterTeam || filterSeason ? 'Keine Spieler für die gewählten Filter im Kader.' : 'Keine Spieler im Kader.'}
                </p>
            )}
          </div>
          
           {!isGameMode && selectedPlayerIds.size > 0 && (
              <div className="mt-4 p-3 bg-gray-900/90 backdrop-blur-sm rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 border border-gray-700">
                <span className="font-semibold text-sm">{selectedPlayerIds.size} Spieler ausgewählt</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={bulkActionType}
                    onChange={(e) => setBulkActionType(e.target.value as 'team' | 'season')}
                    className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="season">Saison zuweisen</option>
                    <option value="team">Team zuweisen</option>
                  </select>

                  {bulkActionType === 'team' ? (
                    <select
                      value={teamToBulkAssign}
                      onChange={(e) => setTeamToBulkAssign(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                    </select>
                  ) : (
                    <select
                      value={seasonToBulkAssign}
                      onChange={(e) => setSeasonToBulkAssign(e.target.value as Season)}
                      className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {SEASONS.map(s => <option key={s} value={s}>Saison {s}</option>)}
                    </select>
                  )}

                  <button onClick={handleBulkAssignment} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-semibold">Zuweisen</button>
                </div>
              </div>
            )}
            
        </main>
        <footer className="p-6 border-t border-gray-700 bg-gray-800">
            <h3 className="text-lg font-semibold mb-2">{editingPlayer ? 'Spieler Bearbeiten' : 'Neuen Spieler Hinzufügen'}</h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                     <input
                        type="text"
                        placeholder="Name"
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        className="bg-gray-700 rounded px-3 py-2 w-full flex-grow text-white placeholder-gray-400 border border-gray-600 focus:ring-orange-500"
                        required
                     />
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <p className="text-sm text-gray-300 mb-2 font-medium">Teams zuweisen:</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {TEAMS.map(team => (
                              <label key={team} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                      type="checkbox"
                                      checked={assignedTeams.has(team)}
                                      onChange={() => handleTeamAssignment(team)}
                                      className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500"
                                  />
                                  <span className="text-white text-sm">{team}</span>
                              </label>
                          ))}
                      </div>
                   </div>

                   <div>
                      <p className="text-sm text-gray-300 mb-2 font-medium">Saisons zuweisen:</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {SEASONS.map(season => (
                              <label key={season} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                      type="checkbox"
                                      checked={assignedSeasons.has(season)}
                                      onChange={() => handleSeasonAssignment(season)}
                                      className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-indigo-500 focus:ring-indigo-500"
                                  />
                                  <span className="text-white text-sm font-semibold">Saison {season}</span>
                              </label>
                          ))}
                      </div>
                   </div>
                 </div>

                 <div className="flex gap-2 w-full sm:w-auto pt-2">
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full sm:w-auto font-semibold">
                        {editingPlayer ? 'Speichern' : 'Hinzufügen'}
                    </button>
                    {editingPlayer && (
                        <button type="button" onClick={cancelEditing} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full sm:w-auto">
                           Abbrechen
                        </button>
                    )}
                 </div>
            </form>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </footer>
      </div>
    </div>
  );
};

export default ManageRosterModal;
