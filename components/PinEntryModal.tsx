
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from './Icons';

interface PinEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
  title: string;
  description: string;
}

const PinEntryModal: React.FC<PinEntryModalProps> = ({ isOpen, onClose, onSuccess, correctPin, title, description }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (pin === correctPin) {
      onSuccess();
    } else {
      setError('Falscher PIN. Bitte erneut versuchen.');
      setPin('');
      inputRef.current?.focus();
    }
  };
  
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setPin(e.target.value);
  }

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleConfirmClick();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold font-teko">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <XMarkIcon />
          </button>
        </header>
        <main className="p-6 text-center">
            <p className="text-gray-300 mb-4">{description}</p>
            <label htmlFor="pin-input" className="block text-sm font-medium text-gray-400 mb-2">
                PIN eingeben:
            </label>
            <input 
                id="pin-input"
                ref={inputRef}
                type="password"
                value={pin}
                onChange={handlePinChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center tracking-widest"
                maxLength={4}
                autoComplete="off"
            />
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </main>
        <footer className="p-4 bg-gray-800 flex justify-end gap-3 border-t border-gray-700">
            <button onClick={handleClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">
                Abbrechen
            </button>
            <button onClick={handleConfirmClick} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                Bestätigen
            </button>
        </footer>
      </div>
    </div>
  );
};

export default PinEntryModal;