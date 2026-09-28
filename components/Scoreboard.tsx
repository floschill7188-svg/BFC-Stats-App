
import React from 'react';
import { Team, GameState } from '../types';
import { ChartBarIcon, ArrowPathIcon, PlayIcon, PauseIcon } from './Icons';

interface ScoreboardProps {
  team: Team;
  activeGame: GameState;
  isUndoable: boolean;
  isTrainer: boolean;
  onNextQuarter: () => void;
  onShowBoxScore: () => void;
  onUndo: () => void;
  onEndGame: () => void;
  onCancelGame: () => void;
  onManageRoster: () => void;
  onShowChangelog: () => void;
  onSaveGame: () => void;
  onTogglePause?: () => void;
  onUpdateGameTime?: (seconds: number) => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ 
    team, activeGame, isUndoable, isTrainer, onNextQuarter, onShowBoxScore, onUndo, onEndGame, onTogglePause
}) => {
  const { quarter, isTournament, gameTime, isPaused, opponent } = activeGame;
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-2xl shadow-xl p-4 md:p-6 border-b-4 border-orange-600 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xs md:text-sm font-black text-gray-500 truncate uppercase tracking-widest">
            {team.name}
          </h2>
          <p className="font-teko text-6xl md:text-8xl leading-none text-white tracking-tighter">{team.score}</p>
        </div>
        
        <div className="flex flex-col items-end">
            {isTournament ? (
                <>
                    <p className="text-gray-500 uppercase font-black tracking-widest text-[10px] md:text-xs">Game Time</p>
                    <p className={`font-teko text-5xl md:text-7xl leading-none ${isPaused ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                        {formatTime(gameTime || 0)}
                    </p>
                </>
            ) : (
                <>
                    <p className="text-gray-500 uppercase font-black tracking-widest text-[10px] md:text-xs">Quarter</p>
                    <p className="font-teko text-6xl md:text-8xl leading-none text-white">Q{quarter}</p>
                </>
            )}
        </div>
      </div>

      {isTournament && (
          <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded-xl">
              <span className="text-[10px] font-black text-gray-500 uppercase">Opponent Score</span>
              <span className="font-teko text-2xl text-gray-400">{(opponent.score || 0)}</span>
          </div>
      )}
      
      <div className="grid grid-cols-4 gap-2">
         <button onClick={onUndo} disabled={!isUndoable || !isTrainer} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 flex items-center justify-center disabled:opacity-30">
            <ArrowPathIcon className="w-5 h-5"/>
         </button>
         <button onClick={onShowBoxScore} className="p-3 bg-orange-600/20 text-orange-400 hover:bg-orange-600/40 rounded-xl flex items-center justify-center">
             <ChartBarIcon className="w-5 h-5"/>
         </button>
         {isTournament ? (
             <button onClick={onTogglePause} className={`p-3 rounded-xl transition-all ${isPaused ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center justify-center`}>
                {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
             </button>
         ) : (
            <button onClick={onNextQuarter} disabled={quarter >= 4 || !isTrainer} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-black text-xs disabled:opacity-30">
                Q+
            </button>
         )}
         <button onClick={onEndGame} disabled={!isTrainer} className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-[10px] uppercase">
            END
         </button>
      </div>
    </div>
  );
};

export default Scoreboard;
