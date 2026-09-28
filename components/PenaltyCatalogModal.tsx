import React, { useState, useEffect } from 'react';
import { XMarkIcon } from './Icons';

interface PenaltyCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (catalog: { [key: string]: number }) => void;
    initialCatalog: { [key: string]: number };
    beerPrice: number;
    penaltyReasons: string[];
}

const PenaltyCatalogModal: React.FC<PenaltyCatalogModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialCatalog,
    beerPrice,
    penaltyReasons
}) => {
    const [editableCatalog, setEditableCatalog] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (isOpen) {
            const fullCatalog = penaltyReasons.reduce((acc, reason) => {
                acc[reason] = initialCatalog[reason] || 0;
                return acc;
            }, {} as { [key: string]: number });
            setEditableCatalog(fullCatalog);
        }
    }, [isOpen, initialCatalog, penaltyReasons]);

    if (!isOpen) return null;

    const handleValueChange = (reason: string, value: string) => {
        const count = parseInt(value, 10);
        if (!isNaN(count) && count >= 0) {
            setEditableCatalog(prev => ({ ...prev, [reason]: count }));
        } else if (value === '') {
             setEditableCatalog(prev => ({ ...prev, [reason]: 0 }));
        }
    };

    const handleSave = () => {
        onSave(editableCatalog);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-xl font-bold font-teko">Strafenkatalog bearbeiten</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon /></button>
                </header>
                <main className="p-6 overflow-y-auto space-y-3">
                     <div className="hidden sm:flex items-center justify-between text-sm font-semibold text-gray-400 px-3 pb-2 border-b border-gray-700">
                        <span className="flex-1">Strafgrund</span>
                        <div className="flex items-center gap-3">
                            <span className="w-24 text-center">Wert (in Strichen)</span>
                            <span className="w-20 text-right">Wert (in €)</span>
                        </div>
                    </div>
                    {penaltyReasons.map(reason => {
                        const penaltyValueInDrinks = editableCatalog[reason] || 0;
                        const costInEuro = penaltyValueInDrinks * beerPrice;

                        return (
                            <div key={reason} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                <span className="text-white mb-2 sm:mb-0 flex-1">{reason}</span>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        value={penaltyValueInDrinks}
                                        onChange={(e) => handleValueChange(reason, e.target.value)}
                                        className="w-24 bg-gray-600 border border-gray-500 rounded-md py-1 px-2 text-white text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        aria-label={`Wert in Strichen für ${reason}`}
                                    />
                                    <span className="text-gray-300 sm:hidden">=</span>
                                    <span className="font-semibold text-orange-400 w-20 text-right">{costInEuro.toFixed(2)}€</span>
                                </div>
                            </div>
                        );
                    })}
                </main>
                <footer className="p-4 bg-gray-800 flex justify-end gap-3 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">Abbrechen</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">Speichern</button>
                </footer>
            </div>
        </div>
    );
};

export default PenaltyCatalogModal;