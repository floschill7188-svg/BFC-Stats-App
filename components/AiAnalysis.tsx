import React, { useState, useEffect, useCallback } from 'react';
import { Team, Opponent } from '../types';
import { GoogleGenAI } from '@google/genai';
import { XMarkIcon, SparklesIcon } from './Icons';

interface AiAnalysisProps {
  team: Team;
  opponent: Opponent;
  onClose: () => void;
  analysisType: 'game' | 'season';
}

const AiAnalysis: React.FC<AiAnalysisProps> = ({ team, opponent, onClose, analysisType }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const generateAnalysis = useCallback(async () => {
    setLoading(true);
    setError('');
    setAnalysis('');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const teamTotals = {
        FGM: team.players.reduce((acc, p) => acc + p.stats.FGM, 0),
        FGA: team.players.reduce((acc, p) => acc + p.stats.FGA, 0),
        '3PM': team.players.reduce((acc, p) => acc + p.stats['3PM'], 0),
        '3PA': team.players.reduce((acc, p) => acc + p.stats['3PA'], 0),
    };

    const isSeasonAnalysis = analysisType === 'season';

    const prompt = isSeasonAnalysis ? `
      Du bist ein erfahrener U18 FIBA Basketball-Coach und Analyst. Analysiere die folgenden Saison-Statistiken für das Team "${team.name}".
      
      Team-Gesamt-Score über die Saison: ${team.score} Punkte

      Aggregierte Spielerstatistiken für dein Team "${team.name}":
      ${team.players.map(p => `- ${p.name}: ${p.stats.FGM*2 + p.stats['3PM']*3 + (p.stats.FTM || 0)} Pkt, ${p.stats.OREB+p.stats.DREB} Reb, ${p.stats.AST} Ast, ${p.stats.STL} Stl, ${p.stats.BLK} Blk, ${p.stats.TO} TO.`).join('\n')}

      Gib eine detaillierte Saisonanalyse in deutscher Sprache im Markdown-Format. Die Analyse sollte folgende Punkte enthalten:
      1.  **Saisonzusammenfassung:** Eine kurze Übersicht über die Gesamtleistung des Teams über die Saison.
      2.  **Schlüsselspieler der Saison:** Identifiziere die Top-Performer und Spieler, die sich im Laufe der Saison entwickelt haben oder konstante Leistungen zeigten.
      3.  **Team-Stärken & Schwächen (Saison-Trends):** Analysiere die Stärken und Schwächen des Teams basierend auf den aggregierten Statistiken. Identifiziere Muster.
      4.  **Coaching-Empfehlungen für die Off-Season:** Gib dir als Coach 3 konkrete, umsetzbare Tipps für das Training in der Saisonpause, um die festgestellten Schwächen zu verbessern und Stärken auszubauen.
    `
    : `
      Du bist ein erfahrener U18 FIBA Basketball-Coach und Analyst. Analysiere den folgenden Box Score für das Team "${team.name}" nach dem Spiel gegen "${opponent.name}".
      
      Team-Ergebnis:
      - ${team.name}: ${team.score} Punkte

      Detaillierte Spielerstatistiken für dein Team "${team.name}":
      ${team.players.map(p => `- ${p.name}: ${p.stats.FGM*2 + p.stats['3PM']*3 + (p.stats.FTM || 0)} Pkt, ${p.stats.OREB+p.stats.DREB} Reb, ${p.stats.AST} Ast, ${p.stats.STL} Stl, ${p.stats.BLK} Blk, ${p.stats.TO} TO.`).join('\n')}

      Team-Wurfquoten für "${team.name}":
      - Feldwürfe (FG): ${teamTotals.FGM + teamTotals['3PM']} von ${teamTotals.FGA + teamTotals['3PA']}
      - Dreier (3P): ${teamTotals['3PM']} von ${teamTotals['3PA']}

      Gib eine detaillierte Analyse in deutscher Sprache im Markdown-Format, die sich auf dein Team "${team.name}" konzentriert. Die Analyse sollte folgende Punkte enthalten:
      1.  **Spielzusammenfassung:** Eine kurze Übersicht über die Leistung deines Teams.
      2.  **Schlüsselspieler:** Identifiziere die Top-Performer und Spieler, die Schwierigkeiten hatten, und begründe deine Einschätzung.
      3.  **Team-Stärken & Schwächen:** Analysiere die Stärken und Schwächen deines Teams basierend auf den Statistiken (z.B. Wurfquoten, Rebounding, Ballverluste).
      4.  **Coaching-Empfehlungen:** Gib dir als Coach 3 konkrete, umsetzbare Tipps für das nächste Training, um die festgestellten Schwächen deines Teams zu verbessern. Sei spezifisch in deinen Übungsvorschlägen.
    `;

    try {
      // Fix: Use 'gemini-3-flash-preview' model for generating content to comply with the latest GenAI SDK standards.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      // Stellt robust sicher, dass die Antwort immer ein String ist. Wandelt falsy-Werte (0, false, null, undefined)
      // in einen leeren String um, bevor der State gesetzt wird, um .split()-Fehler zu vermeiden.
      setAnalysis(String(response.text || ''));
    } catch (err) {
      console.error(err);
      setError("Ein Fehler ist bei der Analyse aufgetreten. Bitte versuche es später erneut.");
    } finally {
      setLoading(false);
    }
  }, [team, opponent, analysisType]);

  useEffect(() => {
    generateAnalysis();
  }, [generateAnalysis]);

  const formatAnalysis = (text: string) => {
    return text
      .split('\n')
      .map((line) => {
        if (line.startsWith('### ')) {
            return `<h3 class="text-xl font-semibold mt-6 mb-2 text-orange-400">${line.substring(4)}</h3>`;
        }
        if (line.startsWith('**')) {
          return `<h4 class="text-lg font-bold mt-4 mb-2">${line.replace(/\*\*/g, '')}</h4>`;
        }
        if (line.startsWith('* ')) {
          return `<li class="ml-5 list-disc my-1">${line.substring(2)}</li>`;
        }
        if (/^\d+\./.test(line)) {
            return `<h4 class="text-md font-semibold mt-3 mb-1 text-gray-100">${line}</h4>`
        }
        if (line.trim() === '') {
            return '<br />';
        }
        return `<p class="my-2">${line}</p>`;
      })
      .join('')
      .replace(/<br \/>(\s*<br \/>)+/g, '<br />'); // Remove multiple line breaks
  };


  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold font-teko flex items-center gap-2"><SparklesIcon /> KI {analysisType === 'season' ? 'Saisonanalyse' : 'Spielanalyse'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon />
          </button>
        </header>
        <main className="p-6 overflow-y-auto text-gray-300">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
              <p className="mt-4 text-lg">Analysiere Daten...</p>
            </div>
          )}
          {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}
          {!loading && !error && (
             <div className="prose prose-invert prose-p:text-gray-300 prose-li:text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: formatAnalysis(analysis) }} />
          )}
        </main>
      </div>
    </div>
  );
};

export default AiAnalysis;