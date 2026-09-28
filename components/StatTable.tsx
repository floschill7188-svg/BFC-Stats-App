
import React, { useState, useMemo, useEffect } from 'react';
import { Team, Player, PlayerStats, Stat } from '../types';
import { calculateTotals, calculateMaximums } from '../utils/stats';
import { ChevronUpIcon, ChevronDownIcon } from './Icons';

type MaxStats = ReturnType<typeof calculateMaximums>;

const getHighlightClass = (value: number, max: number | undefined): string => {
    if (value > 0 && value === max) return 'font-bold text-orange-400';
    if (value === max && max !== 0) return 'font-bold text-orange-400';
    return '';
};

const formatStat = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    // Check if it's effectively an integer
    if (Math.abs(value - Math.round(value)) < 0.001) {
        return Math.round(value).toString();
    }
    // Round to 2 decimal places and let toString() handle trailing zeros.
    return (Math.round(value * 100) / 100).toString();
};

const formatMinutesDisplay = (minutes: number | undefined | null): string => {
    if (minutes === undefined || minutes === null || isNaN(minutes) || minutes < 0) return '00:00';
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const StatInput: React.FC<{
    value: number | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isNegativeAllowed?: boolean;
}> = ({ value, onChange, isNegativeAllowed }) => (
    <input
        type="number"
        value={value ?? ''}
        onChange={onChange}
        min={isNegativeAllowed ? undefined : 0}
        className="w-12 bg-gray-600/50 border border-gray-500 rounded-md shadow-sm py-0.5 px-1 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-center"
    />
);

const PlayerStatRow: React.FC<{ 
    player: Player; 
    showDetails: boolean; 
    maximums: MaxStats; 
    isEditable?: boolean;
    onStatChange?: (playerId: number, stat: Stat, value: string | number) => void;
}> = ({ player, showDetails, maximums, isEditable, onStatChange }) => {
    const [minuteString, setMinuteString] = useState(formatMinutesDisplay(player.stats.MIN));

    useEffect(() => {
        setMinuteString(formatMinutesDisplay(player.stats.MIN));
    }, [player.stats.MIN]);

    const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = e.target.value.replace(/[^0-9:]/g, '');
        let finalValue = sanitizedValue;
        if (finalValue.length > 5) finalValue = finalValue.substring(0, 5);
        setMinuteString(finalValue);
    };

    const handleMinutesBlur = () => {
        onStatChange?.(player.id, 'MIN', minuteString);
    };

    const totalPoints = (player.stats.FGM * 2) + (player.stats['3PM'] * 3) + (player.stats.FTM || 0);
    const totalRebounds = player.stats.OREB + player.stats.DREB;
    const totalFGM = player.stats.FGM + player.stats['3PM'];
    const totalFGA = player.stats.FGA + player.stats['3PA'];

    const twoPPercentValue = player.stats.FGA > 0 ? (player.stats.FGM / player.stats.FGA) * 100 : 0;
    const fgPercentValue = totalFGA > 0 ? (totalFGM / totalFGA) * 100 : 0;
    const ftPercentValue = player.stats.FTA && player.stats.FTA > 0 ? (((player.stats.FTM || 0) / player.stats.FTA) * 100) : 0;
    const threePPercentValue = player.stats['3PA'] > 0 ? ((player.stats['3PM'] / player.stats['3PA']) * 100) : 0;

    const renderSingleStatCell = (stat: Stat, max: number | undefined, isNegativeAllowed = false) => (
        <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(player.stats[stat] || 0, max)}`}>
            {isEditable ? (
                <StatInput 
                    value={player.stats[stat]} 
                    onChange={e => onStatChange?.(player.id, stat, e.target.value)}
                    isNegativeAllowed={isNegativeAllowed}
                />
            ) : (
                formatStat(player.stats[stat])
            )}
        </td>
    );

    const renderPairedStatCell = (madeStat: 'FGM' | 'FTM' | '3PM', attemptedStat: 'FGA' | 'FTA' | '3PA', max: number | undefined) => (
        <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(player.stats[madeStat] || 0, max)}`}>
            {isEditable ? (
                <div className="flex items-center justify-center gap-1">
                    <StatInput value={player.stats[madeStat]} onChange={e => onStatChange?.(player.id, madeStat, e.target.value)} />
                    <span className="text-gray-500">-</span>
                    <StatInput value={player.stats[attemptedStat]} onChange={e => onStatChange?.(player.id, attemptedStat, e.target.value)} />
                </div>
            ) : (
                `${formatStat(player.stats[madeStat])}-${formatStat(player.stats[attemptedStat])}`
            )}
        </td>
    );
    
    // In edit mode, 2-pointers are edited in the FG column
    const fgMade = isEditable ? player.stats.FGM : totalFGM;
    const fgAttempted = isEditable ? player.stats.FGA : totalFGA;

    return (
        <tr className="border-b border-gray-700 hover:bg-gray-700/50">
            {/* Sticky Player Name Column */}
            <td className="py-2.5 px-3 font-medium text-left sticky left-0 z-10 bg-gray-800 border-r border-gray-700 min-w-[160px] sm:min-w-[190px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2 leading-normal">
                    {player.number !== undefined && <span className="text-gray-400 text-xs font-mono w-5 shrink-0">{player.number}</span>}
                    <span className="whitespace-nowrap font-medium text-gray-100 leading-relaxed inline-block py-0.5" title={player.name}>{player.name}</span>
                </div>
            </td>

            <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(player.stats.MIN || 0, maximums.MIN)}`}>
                {isEditable ? (
                     <input
                        type="text"
                        value={minuteString}
                        onChange={handleMinutesChange}
                        onBlur={handleMinutesBlur}
                        placeholder="MM:SS"
                        className="w-16 bg-gray-600/50 border border-gray-500 rounded-md shadow-sm py-0.5 px-1 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-center"
                    />
                ) : formatMinutesDisplay(player.stats.MIN)}
            </td>
            <td className={`py-2.5 px-2 text-center font-bold whitespace-nowrap leading-normal bg-gray-800/30 ${getHighlightClass(totalPoints, maximums.P)}`}>{formatStat(totalPoints)}</td>
            
            <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(totalFGM, maximums.FGM)}`}>
                {isEditable ? (
                    <div className="flex items-center justify-center gap-1">
                        <StatInput value={player.stats.FGM} onChange={e => onStatChange?.(player.id, 'FGM', e.target.value)} />
                        <span className="text-gray-500">-</span>
                        <StatInput value={player.stats.FGA} onChange={e => onStatChange?.(player.id, 'FGA', e.target.value)} />
                    </div>
                ) : (
                    `${formatStat(fgMade)}-${formatStat(fgAttempted)}`
                )}
            </td>

            {showDetails && <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(fgPercentValue, maximums.FG_PCT)}`}>{formatStat(fgPercentValue)}%</td>}

            {renderPairedStatCell('FGM', 'FGA', maximums.FGM_2P)}
            {showDetails && <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(twoPPercentValue, maximums.TWO_P_PCT)}`}>{formatStat(twoPPercentValue)}%</td>}

            {renderPairedStatCell('3PM', '3PA', maximums.THREE_PM)}
            {showDetails && <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(threePPercentValue, maximums.THREE_P_PCT)}`}>{formatStat(threePPercentValue)}%</td>}

            {renderPairedStatCell('FTM', 'FTA', maximums.FTM)}
            {showDetails && <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(ftPercentValue, maximums.FT_PCT)}`}>{formatStat(ftPercentValue)}%</td>}

            
            {showDetails ? (
                <>
                    {renderSingleStatCell('OREB', maximums.OREB)}
                    {renderSingleStatCell('DREB', maximums.DREB)}
                    <td className={`py-2.5 px-2 text-center font-bold whitespace-nowrap leading-normal ${getHighlightClass(totalRebounds, maximums.REB)}`}>{formatStat(totalRebounds)}</td>
                </>
            ) : (
                <td className={`py-2.5 px-2 text-center whitespace-nowrap leading-normal ${getHighlightClass(totalRebounds, maximums.REB)}`}>
                    {isEditable ? (
                        <div className="flex items-center justify-center gap-1" title="Offensiv- / Defensiv-Rebounds">
                            <StatInput value={player.stats.OREB} onChange={e => onStatChange?.(player.id, 'OREB', e.target.value)} />
                            <span className="text-gray-500">/</span>
                            <StatInput value={player.stats.DREB} onChange={e => onStatChange?.(player.id, 'DREB', e.target.value)} />
                        </div>
                    ) : (
                        formatStat(totalRebounds)
                    )}
                </td>
            )}

            {renderSingleStatCell('AST', maximums.AST)}
            {renderSingleStatCell('STL', maximums.STL)}
            {renderSingleStatCell('BLK', maximums.BLK)}
            {renderSingleStatCell('PF', maximums.PF)}
            {renderSingleStatCell('TO', maximums.TO)}
            {renderSingleStatCell('PLUS_MINUS', maximums.PLUS_MINUS, true)}
        </tr>
    );
};

type SortableKey = keyof PlayerStats | 'name' | 'P' | 'FGM_TOTAL' | 'FG_PCT' | 'FT_PCT' | 'THREE_P_PCT' | 'REB' | 'TWO_P_PCT';
interface SortConfig {
    key: SortableKey;
    direction: 'asc' | 'desc';
}

const getValueForSort = (player: Player, key: SortableKey): number | string => {
    const { stats } = player;
    switch (key) {
        case 'name': return player.name;
        case 'P': return (stats.FGM * 2) + (stats['3PM'] * 3) + (stats.FTM || 0);
        case 'REB': return stats.OREB + stats.DREB;
        case 'FGM_TOTAL': return stats.FGM + stats['3PM'];
        case 'FG_PCT': {
            const totalFGA = stats.FGA + stats['3PA'];
            return totalFGA > 0 ? ((stats.FGM + stats['3PM']) / totalFGA) : 0;
        }
        case 'FT_PCT':
            return (stats.FTA && stats.FTA > 0) ? ((stats.FTM || 0) / stats.FTA) : 0;
        case 'THREE_P_PCT':
            return stats['3PA'] > 0 ? (stats['3PM'] / stats['3PA']) : 0;
        case 'TWO_P_PCT':
            return stats.FGA > 0 ? (stats.FGM / stats.FGA) : 0;
        default:
            return stats[key as keyof PlayerStats] || 0;
    }
};

export const TeamTable: React.FC<{ 
    team: Team; 
    showScore?: boolean; 
    isEditable?: boolean;
    onStatChange?: (playerId: number, stat: Stat, value: number | string) => void;
    showPlayerNumber?: boolean;
}> = ({ team, showScore = true, isEditable, onStatChange }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>(''); // "" bedeutet alle Spieler
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'P', direction: 'desc' });

    const processedPlayers = useMemo(() => {
        let filteredPlayers = [...team.players];

        if (selectedPlayerId) {
            filteredPlayers = filteredPlayers.filter(p =>
                p.id.toString() === selectedPlayerId
            );
        }

        if (sortConfig !== null && !isEditable) { // Sorting disabled in edit mode to prevent jumps
            filteredPlayers.sort((a, b) => {
                const aValue = getValueForSort(a, sortConfig.key);
                const bValue = getValueForSort(b, sortConfig.key);

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return filteredPlayers;
    }, [team.players, selectedPlayerId, sortConfig, isEditable]);

    const requestSort = (key: SortableKey) => {
        if (isEditable) return; // Disable sorting in edit mode
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const totals = calculateTotals(team.players);
    const maximums = calculateMaximums(team.players);

    const totalPoints = (totals.FGM * 2) + (totals['3PM'] * 3) + (totals.FTM || 0);
    const totalRebounds = totals.OREB + totals.DREB;
    const twoPPercent = totals.FGA > 0 ? (totals.FGM / totals.FGA * 100) : 0;
    const fgPercent = totals.FGA + totals['3PA'] > 0 ? (((totals.FGM + totals['3PM']) / (totals.FGA + totals['3PA'])) * 100) : 0;
    const ftPercent = totals.FTA && totals.FTA > 0 ? (((totals.FTM || 0) / totals.FTA) * 100) : 0;
    const threePPercent = totals['3PA'] > 0 ? ((totals['3PM'] / totals['3PA']) * 100) : 0;
    
    const getHeaders = (details: boolean) => {
        const headerConfig: { key: string; label: string; sortable: boolean; align?: string }[] = [
            // Name Header is handled separately due to sticky positioning
            { key: 'MIN', label: 'MIN', sortable: true },
            { key: 'P', label: 'P', sortable: true },
            { key: 'FGM_TOTAL', label: 'FG', sortable: true },
            ...(details ? [{ key: 'FG_PCT', label: 'FG%', sortable: true }] : []),
            { key: 'FGM', label: '2P', sortable: true },
            ...(details ? [{ key: 'TWO_P_PCT', label: '2P%', sortable: true }] : []),
            { key: 'THREE_PM', label: '3P', sortable: true },
            ...(details ? [{ key: 'THREE_P_PCT', label: '3P%', sortable: true }] : []),
            { key: 'FTM', label: 'FW', sortable: true },
            ...(details ? [{ key: 'FT_PCT', label: 'FW%', sortable: true }] : []),
            ...(details ? [{ key: 'OREB', label: 'OREB', sortable: true }, { key: 'DREB', label: 'DREB', sortable: true }] : []),
            { key: 'REB', label: 'REB', sortable: true },
            { key: 'AST', label: 'AST', sortable: true },
            { key: 'STL', label: 'STL', sortable: true },
            { key: 'BLK', label: 'BLK', sortable: true },
            { key: 'PF', label: 'PF', sortable: true },
            { key: 'TO', label: 'TO', sortable: true },
            { key: 'PLUS_MINUS', label: '+/-', sortable: true }
        ];
        // In edit mode, change header labels for clarity
        if(isEditable) {
            const fgHeader = headerConfig.find(h => h.key === 'FGM_TOTAL');
            if(fgHeader) fgHeader.label = '2P';

            const rebHeader = headerConfig.find(h => h.key === 'REB');
            // If we are in simple view (no separate OREB/DREB columns),
            // clarify what to edit in the combined REB column.
            if (rebHeader && !details) {
                rebHeader.label = 'O/D REB';
            }
        }
        return headerConfig;
    };
    
    const headers = getHeaders(showDetails);

    const SortableHeader: React.FC<{ config: typeof headers[0] }> = ({ config }) => {
        const isSorted = sortConfig?.key === config.key;
        return (
            <th className={`py-2.5 px-2 font-semibold whitespace-nowrap leading-normal text-${config.align || 'center'}`}>
                {config.sortable && !isEditable ? (
                    <button onClick={() => requestSort(config.key as SortableKey)} className="flex items-center justify-center w-full hover:text-white transition-colors">
                        {config.label}
                        {isSorted ? (
                            sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />
                        ) : null}
                    </button>
                ) : (
                    config.label
                )}
            </th>
        );
    };

    return (
        <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <h3 className="text-xl font-bold">
                    {team.name}
                    {showScore && ` - ${formatStat(team.score)}`}
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    {!isEditable && (
                        <select
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500 w-full sm:w-48"
                            aria-label="Spieler filtern"
                        >
                            <option value="">Alle Spieler</option>
                            {[...team.players]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(player => (
                                    <option key={player.id} value={player.id.toString()}>
                                        {player.name}
                                    </option>
                                ))
                            }
                        </select>
                    )}
                    <button 
                        onClick={() => setShowDetails(!showDetails)}
                        className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md transition-colors w-full sm:w-auto"
                    >
                        {showDetails ? 'Details ausblenden' : 'Details einblenden'}
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                    <thead className="bg-gray-700 text-gray-300">
                        <tr>
                             {/* Sticky Name Header */}
                            <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-left sticky left-0 z-20 bg-gray-700 border-r border-gray-600 min-w-[160px] sm:min-w-[190px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                                { !isEditable ? (
                                    <button onClick={() => requestSort('name')} className="flex items-center w-full hover:text-white transition-colors">
                                        Spieler
                                        {sortConfig?.key === 'name' ? (
                                            sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />
                                        ) : null}
                                    </button>
                                ) : "Spieler"}
                            </th>
                            {headers.map(h => <SortableHeader key={h.key} config={h} />)}
                        </tr>
                    </thead>
                    <tbody>
                        {processedPlayers.map(p => <PlayerStatRow key={p.id} player={p} showDetails={showDetails} maximums={maximums} isEditable={isEditable} onStatChange={onStatChange} />)}
                        <tr className="bg-gray-700 font-bold border-t-2 border-gray-500">
                           <td className="py-2.5 px-3 text-left sticky left-0 z-10 bg-gray-700 border-r border-gray-600 min-w-[160px] sm:min-w-[190px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">TOTAL</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatMinutesDisplay(totals.MIN)}</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totalPoints)}</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{`${formatStat(totals.FGM + totals['3PM'])}-${formatStat(totals.FGA + totals['3PA'])}`}</td>
                            {showDetails && <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(fgPercent)}%</td>}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{`${formatStat(totals.FGM)}-${formatStat(totals.FGA)}`}</td>
                            {showDetails && <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(twoPPercent)}%</td>}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{`${formatStat(totals['3PM'])}-${formatStat(totals['3PA'])}`}</td>
                            {showDetails && <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(threePPercent)}%</td>}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{`${formatStat(totals.FTM)}-${formatStat(totals.FTA)}`}</td>
                            {showDetails && <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(ftPercent)}%</td>}

                            {showDetails ? (
                                <>
                                    <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.OREB)}</td>
                                    <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.DREB)}</td>
                                    <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totalRebounds)}</td>
                                </>
                            ) : (
                                <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totalRebounds)}</td>
                            )}

                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.AST)}</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.STL)}</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.BLK)}</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.PF)}</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.TO)}</td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap leading-normal">{formatStat(totals.PLUS_MINUS)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};