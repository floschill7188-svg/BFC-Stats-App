import { Team, Player, PlayerStats, Opponent, MasterRosterPlayer, GameState } from '../types';

declare const XLSX: any;

export const calculateTotals = (players: Player[]): PlayerStats => {
    const totals: PlayerStats = { FGM: 0, FGA: 0, '3PM': 0, '3PA': 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TO: 0, MIN: 0, FTM: 0, FTA: 0, PF: 0, PLUS_MINUS: 0 };
    players.forEach(p => {
        (Object.keys(p.stats) as Array<keyof PlayerStats>).forEach(key => {
            totals[key] = (totals[key] || 0) + (p.stats[key] || 0);
        });
    });
    return totals;
};

// New function to calculate the maximum values for key stats
export const calculateMaximums = (players: Player[]) => {
    const maxStats = {
        P: 0, REB: 0, AST: 0, STL: 0, BLK: 0, OREB: 0, DREB: 0,
        MIN: 0,
        FGM: 0, // total FGM (2P+3P)
        FGM_2P: 0,
        FTM: 0,
        THREE_PM: 0,
        PF: 0,
        TO: 0,
        PLUS_MINUS: -Infinity, // Can be negative, so start very low
        FG_PCT: 0,
        FT_PCT: 0,
        THREE_P_PCT: 0,
        TWO_P_PCT: 0
    };

    if (players.length === 0) {
        return maxStats;
    }

    // First pass to find max raw values
    players.forEach(p => {
        const totalPoints = (p.stats.FGM * 2) + (p.stats['3PM'] * 3) + (p.stats.FTM || 0);
        const totalRebounds = p.stats.OREB + p.stats.DREB;
        const totalFGM = p.stats.FGM + p.stats['3PM'];

        if (totalPoints > maxStats.P) maxStats.P = totalPoints;
        if (totalRebounds > maxStats.REB) maxStats.REB = totalRebounds;
        if (p.stats.OREB > maxStats.OREB) maxStats.OREB = p.stats.OREB;
        if (p.stats.DREB > maxStats.DREB) maxStats.DREB = p.stats.DREB;
        if (p.stats.AST > maxStats.AST) maxStats.AST = p.stats.AST;
        if (p.stats.STL > maxStats.STL) maxStats.STL = p.stats.STL;
        if (p.stats.BLK > maxStats.BLK) maxStats.BLK = p.stats.BLK;

        if ((p.stats.MIN || 0) > maxStats.MIN) maxStats.MIN = p.stats.MIN || 0;
        if (p.stats.FGM > maxStats.FGM_2P) maxStats.FGM_2P = p.stats.FGM;
        if (totalFGM > maxStats.FGM) maxStats.FGM = totalFGM;
        if ((p.stats.FTM || 0) > maxStats.FTM) maxStats.FTM = p.stats.FTM || 0;
        if (p.stats['3PM'] > maxStats.THREE_PM) maxStats.THREE_PM = p.stats['3PM'];
        if ((p.stats.PF || 0) > maxStats.PF) maxStats.PF = p.stats.PF || 0;
        if (p.stats.TO > maxStats.TO) maxStats.TO = p.stats.TO;
        if ((p.stats.PLUS_MINUS ?? -Infinity) > maxStats.PLUS_MINUS) maxStats.PLUS_MINUS = p.stats.PLUS_MINUS ?? 0;
    });
    
    // Second pass to find max percentages (only considering players with attempts)
    players.forEach(p => {
        const totalFGM = p.stats.FGM + p.stats['3PM'];
        const totalFGA = p.stats.FGA + p.stats['3PA'];
        if (totalFGA > 0) {
            const fgPercent = (totalFGM / totalFGA) * 100;
            if (fgPercent > maxStats.FG_PCT) maxStats.FG_PCT = fgPercent;
        }

        if (p.stats.FGA > 0) {
            const twoPPercent = (p.stats.FGM / p.stats.FGA) * 100;
            if (twoPPercent > maxStats.TWO_P_PCT) maxStats.TWO_P_PCT = twoPPercent;
        }

        if (p.stats.FTA && p.stats.FTA > 0) {
            const ftPercent = ((p.stats.FTM || 0) / p.stats.FTA) * 100;
            if (ftPercent > maxStats.FT_PCT) maxStats.FT_PCT = ftPercent;
        }

        if (p.stats['3PA'] > 0) {
            const threePPercent = (p.stats['3PM'] / p.stats['3PA']) * 100;
            if (threePPercent > maxStats.THREE_P_PCT) maxStats.THREE_P_PCT = threePPercent;
        }
    });

    return maxStats;
};


export const exportGameToCsv = (team: Team, opponent: Opponent) => {
    const headers = ['Spieler', 'MIN', 'Punkte', 'FGM', 'FGA', 'FTM', 'FTA', '3PM', '3PA', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'PF', 'TO', '+/-'];

    const playerToCsvRow = (p: { name: string, stats: PlayerStats }) => [
        `"${p.name}"`,
        p.stats.MIN || 0,
        (p.stats.FGM * 2) + (p.stats['3PM'] * 3) + (p.stats.FTM || 0),
        p.stats.FGM, p.stats.FGA,
        p.stats.FTM || 0, p.stats.FTA || 0,
        p.stats['3PM'], p.stats['3PA'],
        p.stats.OREB, p.stats.DREB, p.stats.AST, p.stats.STL, p.stats.BLK,
        p.stats.PF || 0,
        p.stats.TO,
        p.stats.PLUS_MINUS || 0
    ];
    
    const totals = calculateTotals(team.players);
    const totalsRowData = { name: 'TOTAL', stats: totals };
    
    const playerRows = team.players.map(p => playerToCsvRow(p).join(','));
    const totalRow = playerToCsvRow(totalsRowData).join(',');

    const rows = [
        headers.join(','),
        ...playerRows,
        totalRow
    ];
    
    const csvString = rows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileName = `${team.name}_vs_${opponent.name}_stats.csv`.replace(/ /g, '_');
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportGameToXls = (team: Team, opponent: Opponent) => {
    if (typeof XLSX === 'undefined') {
        alert("Excel-Export-Bibliothek nicht geladen. Bitte versuchen Sie es erneut.");
        return;
    }

    const headers = [
        'Spieler', 'MIN', 'P', 'FG', 'FGA', 'FG%', '2P', '2PA', '2P%', '3P', '3PA', '3P%', 'FT', 'FTA', 'FT%',
        'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', '+/-'
    ];

    const data: Record<string, string | number>[] = team.players.map(p => {
        const stats = p.stats;
        const totalPoints = (stats.FGM * 2) + (stats['3PM'] * 3) + (stats.FTM || 0);
        const totalFGM = stats.FGM + stats['3PM'];
        const totalFGA = stats.FGA + stats['3PA'];
        const totalRebounds = stats.OREB + stats.DREB;
        
        const fgPercent = totalFGA > 0 ? (totalFGM / totalFGA) : 0;
        const twoPPercent = stats.FGA > 0 ? (stats.FGM / stats.FGA) : 0;
        const threePPercent = stats['3PA'] > 0 ? (stats['3PM'] / stats['3PA']) : 0;
        const ftPercent = (stats.FTA && stats.FTA > 0) ? ((stats.FTM || 0) / stats.FTA) : 0;

        return {
            'Spieler': p.name, 'MIN': stats.MIN || 0, 'P': totalPoints,
            'FG': totalFGM, 'FGA': totalFGA, 'FG%': fgPercent,
            '2P': stats.FGM, '2PA': stats.FGA, '2P%': twoPPercent,
            '3P': stats['3PM'], '3PA': stats['3PA'], '3P%': threePPercent,
            'FT': stats.FTM || 0, 'FTA': stats.FTA || 0, 'FT%': ftPercent,
            'OREB': stats.OREB, 'DREB': stats.DREB, 'REB': totalRebounds,
            'AST': stats.AST, 'STL': stats.STL, 'BLK': stats.BLK, 'TO': stats.TO,
            'PF': stats.PF || 0, '+/-': stats.PLUS_MINUS || 0,
        };
    });

    const totals = calculateTotals(team.players);
    const totalPoints = (totals.FGM * 2) + (totals['3PM'] * 3) + (totals.FTM || 0);
    const totalFGM = totals.FGM + totals['3PM'];
    const totalFGA = totals.FGA + totals['3PA'];
    const totalRebounds = totals.OREB + totals.DREB;
    const fgPercent = totalFGA > 0 ? (totalFGM / totalFGA) : 0;
    const twoPPercentTotal = totals.FGA > 0 ? (totals.FGM / totals.FGA) : 0;
    const threePPercent = totals['3PA'] > 0 ? (totals['3PM'] / totals['3PA']) : 0;
    const ftPercent = (totals.FTA && totals.FTA > 0) ? ((totals.FTM || 0) / totals.FTA) : 0;

    data.push({
        'Spieler': 'TOTAL', 'MIN': totals.MIN || 0, 'P': totalPoints,
        'FG': totalFGM, 'FGA': totalFGA, 'FG%': fgPercent,
        '2P': totals.FGM, '2PA': totals.FGA, '2P%': twoPPercentTotal,
        '3P': totals['3PM'], '3PA': totals['3PA'], '3P%': threePPercent,
        'FT': totals.FTM || 0, 'FTA': totals.FTA || 0, 'FT%': ftPercent,
        'OREB': totals.OREB, 'DREB': totals.DREB, 'REB': totalRebounds,
        // FIX: Replaced 'stats' with 'totals' to fix reference errors on line 183.
        'AST': totals.AST, 'STL': totals.STL, 'BLK': totals.BLK, 'TO': totals.TO,
        'PF': totals.PF || 0, '+/-': totals.PLUS_MINUS || 0
    });
    
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    
    ws['!cols'] = [ { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 } ];

    const range = XLSX.utils.decode_range(ws['!ref']);
    const headerStyle = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };
    const centerStyle = { alignment: { horizontal: 'center' } };
    const percentageFormat = { numFmt: '0.##%' };

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[address]) ws[address].s = headerStyle;
    }
    
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_ref = XLSX.utils.encode_cell({c:C, r:R});
            if (!ws[cell_ref]) continue;

            if (C > 0) ws[cell_ref].s = centerStyle;
            
            const header = headers[C];
            if (header && header.includes('%')) {
                ws[cell_ref].t = 'n';
                ws[cell_ref].s = { ...centerStyle, ...percentageFormat };
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Spiel-Statistiken');
    const fileName = `${team.name}_vs_${opponent.name}_stats.xlsx`.replace(/ /g, '_');
    XLSX.writeFile(wb, fileName);
};

export const exportSeasonToCsv = (team: Team) => {
    const headers = ['Spieler', 'MIN', 'Punkte', 'FGM', 'FGA', 'FTM', 'FTA', '3PM', '3PA', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'PF', 'TO', '+/-'];

    // This specific row generator handles potential decimal values from average/per-30 views
    const playerToCsvRow = (p: { name: string, stats: PlayerStats }) => {
        const format = (val: number | undefined | null) => (val === undefined || val === null || isNaN(val)) ? '0.00' : val.toFixed(2);
        const stats = p.stats;
        return [
            `"${p.name}"`,
            format(stats.MIN),
            format((stats.FGM * 2) + (stats['3PM'] * 3) + (stats.FTM || 0)),
            format(stats.FGM), format(stats.FGA),
            format(stats.FTM), format(stats.FTA),
            format(stats['3PM']), format(stats['3PA']),
            format(stats.OREB), format(stats.DREB), format(stats.AST), format(stats.STL), format(stats.BLK),
            format(stats.PF),
            format(stats.TO),
            format(stats.PLUS_MINUS)
        ].join(',');
    };
    
    const totals = calculateTotals(team.players);
    const totalsRowData = { name: 'TOTAL', stats: totals };
    
    const playerRows = team.players.map(p => playerToCsvRow(p));
    const totalRow = playerToCsvRow(totalsRowData);

    const rows = [
        headers.join(','),
        ...playerRows,
        totalRow
    ];
    
    const csvString = rows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileName = `${team.name.replace(/ /g, '_')}_Saison_Stats.csv`;
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportSeasonToXls = (team: Team) => {
    if (typeof XLSX === 'undefined') {
        alert("Excel-Export-Bibliothek nicht geladen. Bitte versuchen Sie es erneut.");
        return;
    }

    const headers = [
        'Spieler', 'P', 'FG', 'FGA', 'FG%', '3P', '3PA', '3P%', 'FT', 'FTA', 'FT%',
        'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', '+/-'
    ];

    const data: Record<string, string | number>[] = team.players.map(p => {
        const stats = p.stats;
        const totalPoints = (stats.FGM * 2) + (stats['3PM'] * 3) + (stats.FTM || 0);
        const totalFGM = stats.FGM + stats['3PM'];
        const totalFGA = stats.FGA + stats['3PA'];
        const totalRebounds = stats.OREB + stats.DREB;
        
        const fgPercent = totalFGA > 0 ? (totalFGM / totalFGA) : 0;
        const threePPercent = stats['3PA'] > 0 ? (stats['3PM'] / stats['3PA']) : 0;
        const ftPercent = (stats.FTA && stats.FTA > 0) ? ((stats.FTM || 0) / stats.FTA) : 0;

        return {
            'Spieler': p.name, 'P': totalPoints,
            'FG': totalFGM, 'FGA': totalFGA, 'FG%': fgPercent,
            '3P': stats['3PM'], '3PA': stats['3PA'], '3P%': threePPercent,
            'FT': stats.FTM || 0, 'FTA': stats.FTA || 0, 'FT%': ftPercent,
            'OREB': stats.OREB, 'DREB': stats.DREB, 'REB': totalRebounds,
            'AST': stats.AST, 'STL': stats.STL, 'BLK': stats.BLK, 'TO': stats.TO,
            'PF': stats.PF || 0, '+/-': stats.PLUS_MINUS || 0,
        };
    });

    const totals = calculateTotals(team.players);
    const totalPoints = (totals.FGM * 2) + (totals['3PM'] * 3) + (totals.FTM || 0);
    const totalFGM = totals.FGM + totals['3PM'];
    const totalFGA = totals.FGA + totals['3PA'];
    const totalRebounds = totals.OREB + totals.DREB;
    const fgPercent = totalFGA > 0 ? (totalFGM / totalFGA) : 0;
    const threePPercent = totals['3PA'] > 0 ? (totals['3PM'] / totals['3PA']) : 0;
    const ftPercent = (totals.FTA && totals.FTA > 0) ? ((totals.FTM || 0) / totals.FTA) : 0;

    data.push({
        'Spieler': 'TOTAL', 'P': totalPoints,
        'FG': totalFGM, 'FGA': totalFGA, 'FG%': fgPercent,
        '3P': totals['3PM'], '3PA': totals['3PA'], '3P%': threePPercent,
        'FT': totals.FTM || 0, 'FTA': totals.FTA || 0, 'FT%': ftPercent,
        'OREB': totals.OREB, 'DREB': totals.DREB, 'REB': totalRebounds,
        'AST': totals.AST, 'STL': totals.STL, 'BLK': totals.BLK, 'TO': totals.TO,
        'PF': totals.PF || 0, '+/-': totals.PLUS_MINUS || 0
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    
    ws['!cols'] = [ { wch: 20 }, ...Array(18).fill({ wch: 8 }) ];

    const range = XLSX.utils.decode_range(ws['!ref']);
    const headerStyle = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };
    const centerStyle = { alignment: { horizontal: 'center' } };
    const percentageFormat = { numFmt: '0.##%' };

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[address]) ws[address].s = headerStyle;
    }
    
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_ref = XLSX.utils.encode_cell({c:C, r:R});
            if (!ws[cell_ref]) continue;

            if (C > 0) ws[cell_ref].s = centerStyle;
            
            const header = headers[C];
            if (header && header.includes('%')) {
                ws[cell_ref].t = 'n';
                ws[cell_ref].s = { ...centerStyle, ...percentageFormat };
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saison-Statistiken');
    const fileName = `${team.name.replace(/ /g, '_')}_Saison_Stats.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const exportRosterToXls = (roster: MasterRosterPlayer[]) => {
    if (typeof XLSX === 'undefined') {
        alert("Excel-Export-Bibliothek nicht geladen. Bitte versuchen Sie es erneut.");
        return;
    }

    const headers = ['Name', 'Team 1', 'Team 2', 'Team 3'];

    const data = roster.map(player => {
        const row: (string | null)[] = [player.name];
        const teams = player.teams || [];
        for (let i = 0; i < 3; i++) {
            row.push(teams[i] || '');
        }
        return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    ws['!cols'] = [ { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 } ];

    const range = XLSX.utils.decode_range(ws['!ref']);
    const headerStyle = { font: { bold: true }, alignment: { horizontal: 'left' } };

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[address]) ws[address].s = headerStyle;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kader');
    const fileName = `BFC_Kader.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const importGameFromXls = (
    file: File, 
    gameId: number,
    masterRoster: MasterRosterPlayer[]
): Promise<{ newGame: GameState; updatedRoster: MasterRosterPlayer[] } | null> => {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            console.error("XLSX library not loaded.");
            return resolve(null);
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                const nameMatch = file.name.match(/(.*)_vs_(.*)_stats\.(xlsx|xls)/i);
                if (!nameMatch) {
                    console.error("Filename does not match expected format 'TeamA_vs_TeamB_stats.xlsx'");
                    return resolve(null);
                }
                const teamName = nameMatch[1].replace(/_/g, ' ');
                const opponentName = nameMatch[2].replace(/_/g, ' ');

                const updatedRoster = [...masterRoster];
                let maxId = masterRoster.reduce((max, p) => Math.max(p.id, max), 0);
                
                const gamePlayersMap = new Map<string, Player>();

                for (const row of json) {
                    if (row['Spieler'] === 'TOTAL') continue;

                    const playerName = row['Spieler'];
                    if (!playerName) continue;
                    
                    const playerKey = playerName.trim().toLowerCase();
                    const existingPlayerInGame = gamePlayersMap.get(playerKey);

                    const stats: PlayerStats = {
                        FGM: (row['FG'] || 0) - (row['3P'] || 0),
                        FGA: (row['FGA'] || 0) - (row['3PA'] || 0),
                        '3PM': row['3P'] || 0,
                        '3PA': row['3PA'] || 0,
                        FTM: row['FT'] || 0,
                        FTA: row['FTA'] || 0,
                        OREB: row['OREB'] || 0,
                        DREB: row['DREB'] || 0,
                        AST: row['AST'] || 0,
                        STL: row['STL'] || 0,
                        BLK: row['BLK'] || 0,
                        TO: row['TO'] || 0,
                        MIN: row['MIN'] || 0,
                        PF: row['PF'] || 0,
                        PLUS_MINUS: row['+/-'] || 0
                    };

                    if (existingPlayerInGame) {
                        // Aggregate stats if player is already in the map for this game
                        Object.keys(stats).forEach(key => {
                            const statKey = key as keyof PlayerStats;
                            existingPlayerInGame.stats[statKey] = (existingPlayerInGame.stats[statKey] || 0) + (stats[statKey] || 0);
                        });
                    } else {
                        // Find or create player in master roster and add to game map
                        let masterPlayer = updatedRoster.find(p => 
                            p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
                        );

                        if (!masterPlayer) {
                            const newMasterPlayer: MasterRosterPlayer = {
                                id: ++maxId,
                                name: playerName,
                                teams: [teamName]
                            };
                            updatedRoster.push(newMasterPlayer);
                            masterPlayer = newMasterPlayer;
                        }

                        gamePlayersMap.set(playerKey, { ...masterPlayer, stats });
                    }
                }
                
                const gamePlayers = Array.from(gamePlayersMap.values());
                
                if (gamePlayers.length === 0) {
                    console.error("No player data found in the Excel file.");
                    return resolve(null);
                }

                const totalScore = gamePlayers.reduce((acc, p) => acc + (p.stats.FGM * 2) + (p.stats['3PM'] * 3) + (p.stats.FTM || 0), 0);

                // Fix: Adding missing score property to the opponent object to satisfy the Opponent interface requirements.
                const newGame: GameState = {
                    gameId,
                    status: 'finished',
                    team: { name: teamName, players: gamePlayers, score: totalScore },
                    opponent: { name: opponentName, score: 0 },
                    quarter: 4,
                    actionLog: [],
                };

                resolve({ newGame, updatedRoster });

            } catch (error) {
                console.error("Error processing Excel file:", error);
                resolve(null);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
