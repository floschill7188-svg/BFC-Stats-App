
import React from 'react';
import { ActionLogEntry } from '../types';
import { XMarkIcon, TrashIcon } from './Icons';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ActionLogEntry[];
  isTrainer: boolean;
  onDeleteAction: (actionId: number) => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, actions, isTrainer, onDeleteAction }) => {
  if (!isOpen) return null;

  const recentActions = [...actions].reverse().slice(0, 10);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold font-teko">Letzte Eingaben</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          {recentActions.length > 0 ? (
            <ul className="space-y-3">
              {recentActions.map((action) => (
                <li
                  key={action.id}
                  className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center"
                >
                  <p className="text-gray-200">{action.description}</p>
                  {isTrainer && (
                    <button
                        onClick={() => onDeleteAction(action.id)}
                        className="p-2 bg-red-800/50 hover:bg-red-700 text-red-300 rounded-lg transition-colors"
                        title="Aktion löschen"
                    >
                        <TrashIcon />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-400 py-8">
              Noch keine Aktionen in diesem Spiel erfasst.
            </p>
          )}
        </main>
        <footer className="p-4 bg-gray-800 flex justify-end gap-3 border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">
                Schließen
            </button>
        </footer>
      </div>
    </div>
  );
};

export default ChangelogModal;