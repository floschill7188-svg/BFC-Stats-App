
import React from 'react';
import { XMarkIcon } from './Icons';

interface DeleteGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteGameModal: React.FC<DeleteGameModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold font-teko">Löschen Bestätigen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon />
          </button>
        </header>
        <main className="p-6 text-center">
            <p className="text-gray-300 mb-4">
                Bist du sicher, dass du dieses Spiel endgültig löschen willst?
                <br />
                <strong className="text-red-400">Diese Aktion kann nicht rückgängig gemacht werden.</strong>
            </p>
        </main>
        <footer className="p-4 bg-gray-800 flex justify-end gap-3 border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">
                Abbrechen
            </button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
                Endgültig Löschen
            </button>
        </footer>
      </div>
    </div>
  );
};

export default DeleteGameModal;