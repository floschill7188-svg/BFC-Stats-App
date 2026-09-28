
import React from 'react';
import { Stat } from '../types';

interface ActionControlProps {
  onStatAction: (stat: Stat, missType?: '2P' | '3P' | 'FT') => void;
  selectedAction: { stat: Stat; missType?: '2P' | '3P' | 'FT' } | null;
  disabled: boolean;
}

const ActionButton: React.FC<{
  label: string;
  onClick: () => void;
  className?: string;
  disabled: boolean;
  isActive: boolean;
}> = ({ label, onClick, className, disabled, isActive }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`h-14 md:h-20 rounded-xl text-lg md:text-2xl font-black text-white shadow-lg transition-all transform active:scale-90 disabled:opacity-40 flex items-center justify-center border-b-4 border-black/20 ${
      isActive ? 'ring-4 ring-white scale-105 z-10 shadow-orange-500/50' : ''
    } ${className}`}
  >
    {label}
  </button>
);

const ActionControl: React.FC<ActionControlProps> = ({ onStatAction, selectedAction, disabled }) => {
  const isActionSelected = (stat: Stat, missType?: '2P' | '3P' | 'FT') => {
    if (!selectedAction) return false;
    if (missType) return selectedAction.missType === missType;
    return !selectedAction.missType && selectedAction.stat === stat;
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-4 md:p-6 shadow-2xl border border-gray-700 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs md:text-sm font-black text-gray-500 uppercase tracking-widest">Team Aktionen</h3>
        {selectedAction && (
             <span className="text-[10px] bg-orange-600 px-2 py-0.5 rounded-full font-bold animate-pulse">AKTIV</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Scoring */}
        <ActionButton label="+1" onClick={() => onStatAction('FTM')} disabled={disabled} isActive={isActionSelected('FTM')} className="bg-green-700 hover:bg-green-600" />
        <ActionButton label="+2" onClick={() => onStatAction('FGM')} disabled={disabled} isActive={isActionSelected('FGM')} className="bg-orange-600 hover:bg-orange-500" />
        <ActionButton label="+3" onClick={() => onStatAction('3PM')} disabled={disabled} isActive={isActionSelected('3PM')} className="bg-orange-600 hover:bg-orange-500" />
        
        {/* Misses */}
        <ActionButton label="-1" onClick={() => onStatAction('FTA', 'FT')} disabled={disabled} isActive={isActionSelected('FTA', 'FT')} className="bg-gray-700/50 hover:bg-gray-600 text-gray-400" />
        <ActionButton label="-2" onClick={() => onStatAction('FGA', '2P')} disabled={disabled} isActive={isActionSelected('FGA', '2P')} className="bg-gray-700/50 hover:bg-gray-600 text-gray-400" />
        <ActionButton label="-3" onClick={() => onStatAction('3PA', '3P')} disabled={disabled} isActive={isActionSelected('3PA', '3P')} className="bg-gray-700/50 hover:bg-gray-600 text-gray-400" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        {/* Defense & Hustle */}
        <ActionButton label="Stl" onClick={() => onStatAction('STL')} disabled={disabled} isActive={isActionSelected('STL')} className="bg-teal-600 hover:bg-teal-500" />
        <ActionButton label="Blk" onClick={() => onStatAction('BLK')} disabled={disabled} isActive={isActionSelected('BLK')} className="bg-indigo-700 hover:bg-indigo-600" />
        <ActionButton label="Ast" onClick={() => onStatAction('AST')} disabled={disabled} isActive={isActionSelected('AST')} className="bg-blue-600 hover:bg-blue-500" />
        <ActionButton label="Reb" onClick={() => onStatAction('DREB')} disabled={disabled} isActive={isActionSelected('DREB')} className="bg-blue-700 hover:bg-blue-600" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        {/* Negative / Management */}
        <ActionButton label="TO" onClick={() => onStatAction('TO')} disabled={disabled} isActive={isActionSelected('TO')} className="bg-red-700/80 hover:bg-red-600" />
        <ActionButton label="Foul" onClick={() => onStatAction('PF')} disabled={disabled} isActive={isActionSelected('PF')} className="bg-red-900 hover:bg-red-800" />
      </div>
    </div>
  );
};

export default ActionControl;
