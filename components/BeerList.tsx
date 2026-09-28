import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, setDoc } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { UserProfile, MasterRosterPlayer, BeerListEntry } from '../types';
import { ArrowLeftIcon, XMarkIcon, PencilSquareIcon } from './Icons';
import { ToastType } from './ToastNotification';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PenaltyCatalogModal from './PenaltyCatalogModal'; // Import der neuen Komponente

interface BeerListProps {
    userProfile: UserProfile | null;
    allUsers: UserProfile[];
    onBack: () => void;
    showToast: (message: string, type?: ToastType) => void;
    roster: MasterRosterPlayer[];
}

const BEER_PRICE_REGULAR_DEFAULT = 2.00;
const BEER_PRICE_DISCOUNTED_DEFAULT = 1.50;
const BEER_LIST_COLLECTION = 'beer-list-v2';
const TEAMS_WITH_BEER = ['BFC Herren 1', 'BFC Herren 2'];
const DEFAULT_TEAM_FOR_ENTRIES = 'BFC Herren 1';

const PENALTY_REASONS = [
    'Zu spät zum Training',
    'Unentschuldigtes Fehlen beim Training',
    'Sportutensilien vergessen',
    'Amt nicht ausgeführt',
    'Zu spät zum Treffpunkt Spiel',
    'Technisches Foul',
    'Unentschuldigtes Fehlen beim Spiel',
    'Verweisung aus der Halle',
    'Jahresbeitrag zu spät'
];

interface PlayerBalance {
    userId: string;
    name: string;
    regular: number;
    discounted: number;
    paid: number;
    balance: number;
}

const PenaltyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    targetName: string | null;
    onSave: (reason: string) => void;
    penaltyReasons: string[];
    penaltyCatalog: { [key: string]: number };
    beerPrice: number;
}> = ({ isOpen, onClose, targetName, onSave, penaltyReasons, penaltyCatalog, beerPrice }) => {
    const [reason, setReason] = useState(penaltyReasons[0]);

    useEffect(() => {
        if (isOpen) {
            if (!reason || !penaltyReasons.includes(reason)) {
                setReason(penaltyReasons[0]);
            }
        }
    }, [isOpen, penaltyReasons, reason]);

    if (!isOpen || !targetName) return null;

    const handleSave = () => {
        if (reason.trim()) {
            onSave(reason.trim());
        }
    };

    const penaltyValue = penaltyCatalog[reason] || 0;
    const penaltyCost = penaltyValue * beerPrice;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col">
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-xl font-bold font-teko">Strafe eintragen für {targetName}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon />
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <label htmlFor="penalty-reason" className="block text-sm font-medium text-gray-300 mb-2">
                            Strafgrund
                        </label>
                        <select
                            id="penalty-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                           {penaltyReasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    {penaltyValue > 0 ? (
                         <div className="text-center bg-gray-900/50 p-3 rounded-lg">
                            <p className="text-gray-400">Wert der Strafe:</p>
                            <p className="font-bold text-2xl text-orange-400">
                                {penaltyValue} Strich(e) / {penaltyCost.toFixed(2)}€
                            </p>
                        </div>
                    ) : (
                        <div className="text-center bg-yellow-900/50 p-3 rounded-lg">
                            <p className="text-yellow-400">
                                Für diesen Grund ist kein Strafwert im Katalog hinterlegt. Die Strafe hat aktuell keinen Wert.
                            </p>
                        </div>
                    )}
                </main>
                <footer className="p-4 bg-gray-800 flex justify-end gap-3 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">
                        Abbrechen
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                        Speichern
                    </button>
                </footer>
            </div>
        </div>
    );
};

const PriceEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentPrices: { regular: number; discounted: number };
    onSave: (newPrices: { regular: number; discounted: number }) => void;
}> = ({ isOpen, onClose, currentPrices, onSave }) => {
    const [newPrices, setNewPrices] = useState(currentPrices);

    useEffect(() => {
        if (isOpen) {
            setNewPrices(currentPrices);
        }
    }, [isOpen, currentPrices]);

    if (!isOpen) return null;

    const handleSave = () => {
        const regular = parseFloat(String(newPrices.regular));
        const discounted = parseFloat(String(newPrices.discounted));

        if (isNaN(regular) || isNaN(discounted) || regular < 0 || discounted < 0) {
            alert("Bitte gültige, positive Preise eingeben.");
            return;
        }
        onSave({ regular, discounted });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col">
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-xl font-bold font-teko">Preise anpassen</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon /></button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <label htmlFor="regular-price" className="block text-sm font-medium text-gray-300 mb-2">Preis Normal (€)</label>
                        <input
                            id="regular-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPrices.regular}
                            onChange={(e) => setNewPrices(p => ({ ...p, regular: e.target.value as any }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="discounted-price" className="block text-sm font-medium text-gray-300 mb-2">Preis Ermäßigt (€)</label>
                        <input
                            id="discounted-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPrices.discounted}
                            onChange={(e) => setNewPrices(p => ({ ...p, discounted: e.target.value as any }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </main>
                <footer className="p-4 bg-gray-800 flex justify-end gap-3 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">Abbrechen</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">Speichern</button>
                </footer>
            </div>
        </div>
    );
};


const BeerList: React.FC<BeerListProps> = ({ userProfile, allUsers, onBack, showToast, roster }) => {
    const [entries, setEntries] = useState<BeerListEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [penaltyTarget, setPenaltyTarget] = useState<{ userId: string; name: string } | null>(null);
    const [prices, setPrices] = useState({ regular: BEER_PRICE_REGULAR_DEFAULT, discounted: BEER_PRICE_DISCOUNTED_DEFAULT });
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [drinksToAdd, setDrinksToAdd] = useState({ regular: 0, discounted: 0 });
    
    const [isEditing, setIsEditing] = useState(false);
    const [editableBalances, setEditableBalances] = useState<Map<string, PlayerBalance> | null>(null);

    const [isPenaltyCatalogOpen, setIsPenaltyCatalogOpen] = useState(false);
    const [penaltyCatalog, setPenaltyCatalog] = useState<{[key: string]: number}>({});

    const isCoach = userProfile?.role === 'Trainer' || userProfile?.role === 'CoTrainer';
    const [viewMode, setViewMode] = useState<'overview' | 'personal'>(isCoach ? 'overview' : 'personal');

    const availableTeams = useMemo(() => {
        if (!userProfile) return [];
        if (isCoach) {
            return TEAMS_WITH_BEER;
        }
        return userProfile.playerTeams?.filter(t => TEAMS_WITH_BEER.includes(t)) || [];
    }, [userProfile, isCoach]);

    useEffect(() => {
        const priceDocRef = doc(db, 'app-data', 'beer-prices');
        const unsubscribe = onSnapshot(priceDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPrices({
                    regular: data.regular || BEER_PRICE_REGULAR_DEFAULT,
                    discounted: data.discounted || BEER_PRICE_DISCOUNTED_DEFAULT
                });
            } else {
                setDoc(priceDocRef, { regular: BEER_PRICE_REGULAR_DEFAULT, discounted: BEER_PRICE_DISCOUNTED_DEFAULT }).catch(err => console.error("Could not set default prices", err));
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const catalogDocRef = doc(db, 'app-data', 'penalty-catalog');
        const unsubscribe = onSnapshot(catalogDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setPenaltyCatalog(docSnap.data().penalties || {});
            }
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (availableTeams.length === 0) {
            setLoading(false);
            setEntries([]);
            return;
        }
        setLoading(true);
        setEntries([]); 

        const teamsToFetch = TEAMS_WITH_BEER;
        let initialLoads = teamsToFetch.length;

        const unsubscribers = teamsToFetch.map(team => {
            const entriesCollection = collection(db, BEER_LIST_COLLECTION, team, 'entries');
            const q = query(entriesCollection, orderBy('timestamp', 'desc'));
            return onSnapshot(q, (snapshot) => {
                const teamEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data(), team } as BeerListEntry));
                
                setEntries(prev => {
                    const otherEntries = prev.filter(e => e.team !== team);
                    const newEntries = [...otherEntries, ...teamEntries];
                    newEntries.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                    return newEntries;
                });

                if (initialLoads > 0) {
                    initialLoads--;
                    if (initialLoads === 0) {
                        setLoading(false);
                    }
                }
            }, (error) => {
                console.error(`Error fetching beer list for ${team}:`, error);
                showToast(`Fehler beim Laden der Bierliste für ${team}.`, 'undo');
                if (initialLoads > 0) {
                    initialLoads--;
                    if (initialLoads === 0) {
                        setLoading(false);
                    }
                }
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [availableTeams, showToast]);
    
    const teamRoster = useMemo(() => {
        return roster
            .filter(p => p.teams?.some(t => TEAMS_WITH_BEER.includes(t)))
            .map(p => {
                const user = allUsers.find(u => u.linkedRosterPlayerId === p.id);
                return { ...p, userId: user?.uid, name: p.name };
            });
    }, [roster, allUsers]);

    const allInvolvedUsers = useMemo(() => {
        const userMap = new Map<string, { id: number | string; name: string }>();

        teamRoster.forEach(p => {
            if (p.userId) userMap.set(p.userId, { id: p.id, name: p.name });
        });

        entries.forEach(entry => {
            if (entry.userId && !userMap.has(entry.userId)) {
                const rosterPlayer = roster.find(p => allUsers.find(u => u.uid === entry.userId && u.linkedRosterPlayerId === p.id));
                if (rosterPlayer) {
                    userMap.set(entry.userId, {id: rosterPlayer.id, name: rosterPlayer.name});
                } else {
                    const user = allUsers.find(u => u.uid === entry.userId);
                    if (user) {
                        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.displayName;
                        userMap.set(user.uid, { id: user.uid, name: name || 'Unbekannter Benutzer' });
                    }
                }
            }
        });
        
        if (userProfile && !userMap.has(userProfile.uid)) {
            const name = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userProfile.displayName;
            userMap.set(userProfile.uid, { id: userProfile.uid, name: name || 'Unbekannter Benutzer' });
        }

        const usersWithId = Array.from(userMap.entries()).map(([userId, data]) => ({
            ...data,
            userId,
        }));
        
        return usersWithId.sort((a, b) => a.name.localeCompare(b.name));

    }, [teamRoster, entries, allUsers, userProfile, roster]);

    const playerBalances = useMemo<Map<string, PlayerBalance>>(() => {
        const balances = new Map<string, PlayerBalance>();
        allInvolvedUsers.forEach(player => {
            balances.set(player.userId, { userId: player.userId, name: player.name, regular: 0, discounted: 0, paid: 0, balance: 0 });
        });

        entries.forEach(entry => {
            if (!balances.has(entry.userId)) return;
            const current = balances.get(entry.userId)!;
            if (entry.type === 'drink') {
                current.regular += entry.regularDrinks || 0;
                current.discounted += entry.discountedDrinks || 0;
            } else if (entry.type === 'payment') {
                current.paid += entry.amount || 0;
            }
        });

        balances.forEach((value) => {
            const debt = (value.regular * prices.regular) + (value.discounted * prices.discounted);
            value.balance = debt - value.paid;
        });

        return balances;
    }, [entries, allInvolvedUsers, prices]);

    const handleAddDrinks = async (userId: string, userName: string, regular: number, discounted: number) => {
        if (!userProfile) return;
        if (regular <= 0 && discounted <= 0) return;

        if (!isCoach && userProfile.uid !== userId) {
            showToast("Du kannst nur für dich selbst Getränke eintragen.", 'undo');
            return;
        }

        const collectionRef = collection(db, BEER_LIST_COLLECTION, DEFAULT_TEAM_FOR_ENTRIES, 'entries');
        const finalUserName = playerBalances.get(userId)?.name || userName;

        const payload: Omit<BeerListEntry, 'id'> = {
            type: 'drink',
            userId,
            userName: finalUserName,
            team: DEFAULT_TEAM_FOR_ENTRIES,
            timestamp: serverTimestamp(),
        };

        if (regular > 0) {
            (payload as any).regularDrinks = regular;
        }
        if (discounted > 0) {
            (payload as any).discountedDrinks = discounted;
        }

        try {
            await addDoc(collectionRef, payload);
            showToast(`${regular + discounted} Getränk(e) für ${finalUserName} hinzugefügt.`);
        } catch (error) {
            showToast('Fehler beim Hinzufügen der Getränke.', 'undo');
            console.error(error);
        }
    };
    
    const handleDrinkQuantityChange = (type: 'regular' | 'discounted', delta: number) => {
        setDrinksToAdd(prev => ({
            ...prev,
            [type]: Math.max(0, prev[type] + delta)
        }));
    };

    const handleConfirmAddDrinks = () => {
        if (!userProfile) return;
        const { regular, discounted } = drinksToAdd;
        if (regular > 0 || discounted > 0) {
            handleAddDrinks(userProfile.uid, myName, regular, discounted);
            setDrinksToAdd({ regular: 0, discounted: 0 });
        }
    };

    const handlePaymentAmountChange = (userId: string, value: string) => {
        setPaymentAmounts(prev => ({ ...prev, [userId]: value }));
    };

    const handleAddPayment = async (playerData: PlayerBalance) => {
        if (!isCoach || !userProfile) {
            showToast("Nur Trainer können Zahlungen verbuchen.", 'undo');
            return;
        }
    
        const { userId, name: finalUserName } = playerData;
    
        const amountStr = paymentAmounts[userId];
        if (!amountStr) {
            showToast('Bitte einen Betrag eingeben.', 'undo');
            return;
        }
        
        const amount = parseFloat(amountStr.replace(',', '.').replace('€', '').trim());
        if (isNaN(amount) || amount <= 0) {
            showToast('Ungültiger Betrag.', 'undo');
            return;
        }
    
        const coachProfile = allUsers.find(u => u.uid === userProfile.uid);
        const coachDisplayName = (coachProfile ? 
            ([coachProfile.firstName, coachProfile.lastName].filter(Boolean).join(' ') || coachProfile.displayName) : 
            userProfile.displayName
        ) || 'Trainer';

        const collectionRef = collection(db, BEER_LIST_COLLECTION, DEFAULT_TEAM_FOR_ENTRIES, 'entries');
        
        const newEntry: Omit<BeerListEntry, 'id'> = {
            type: 'payment',
            userId,
            userName: finalUserName,
            amount,
            payerId: userProfile.uid,
            payerName: coachDisplayName,
            team: DEFAULT_TEAM_FOR_ENTRIES,
            timestamp: serverTimestamp()
        };
    
        try {
            await addDoc(collectionRef, newEntry);
            showToast(`Zahlung von ${amount.toFixed(2)}€ für ${finalUserName} verbucht.`);
            setPaymentAmounts(prev => ({ ...prev, [userId]: '' }));
        } catch (error) {
            showToast('Fehler beim Verbuchen der Zahlung.', 'undo');
            console.error("Fehler beim Hinzufügen des Zahlungsdokuments:", error);
        }
    };

    const openPenaltyModal = (userId: string, name: string) => {
        setPenaltyTarget({ userId, name });
        setIsPenaltyModalOpen(true);
    };

    const handleSavePenalty = async (reason: string) => {
        if (!penaltyTarget || !userProfile) return;

        const penaltyValueInDrinks = penaltyCatalog[reason];

        if (penaltyValueInDrinks === undefined || penaltyValueInDrinks <= 0) {
            showToast(`Für "${reason}" ist kein Strafwert hinterlegt.`, 'undo');
            setIsPenaltyModalOpen(false);
            setPenaltyTarget(null);
            return;
        }

        const collectionRef = collection(db, BEER_LIST_COLLECTION, DEFAULT_TEAM_FOR_ENTRIES, 'entries');
        const finalUserName = playerBalances.get(penaltyTarget.userId)?.name || penaltyTarget.name;

        const payload: Omit<BeerListEntry, 'id'> = {
            type: 'drink',
            userId: penaltyTarget.userId,
            userName: finalUserName,
            team: DEFAULT_TEAM_FOR_ENTRIES,
            timestamp: serverTimestamp(),
            regularDrinks: penaltyValueInDrinks,
            notes: `Strafe: ${reason}`
        };

        try {
            await addDoc(collectionRef, payload);
            showToast(`Strafe "${reason}" (${penaltyValueInDrinks} Strich(e)) für ${finalUserName} eingetragen.`);
        } catch (error) {
            showToast('Fehler beim Eintragen der Strafe.', 'undo');
            console.error(error);
        } finally {
            setIsPenaltyModalOpen(false);
            setPenaltyTarget(null);
        }
    };
    
    const handleSavePrices = async (newPrices: { regular: number; discounted: number }) => {
        try {
            await setDoc(doc(db, 'app-data', 'beer-prices'), newPrices, { merge: true });
            showToast('Preise erfolgreich aktualisiert.');
            setIsPriceModalOpen(false);
        } catch (error) {
            console.error("Error saving prices:", error);
            showToast('Fehler beim Speichern der Preise.', 'undo');
        }
    };

    const handleSendReminder = async () => {
        const notificationsCollection = collection(db, "notifications");
        try {
            await addDoc(notificationsCollection, {
                type: 'beerListReminder',
                message: `Erinnerung: Bitte vergesst nicht, eure Getränke einzutragen!`,
                timestamp: serverTimestamp(),
                readBy: [],
                targetRoles: ['Trainer', 'CoTrainer', 'Spieler'],
                linkTo: 'beerList'
            });
            showToast(`Erinnerung zum Eintragen der Getränke wurde gesendet.`, 'success');
        } catch (error) {
            showToast("Fehler beim Senden der Erinnerung.", 'undo');
            console.error("Error sending reminder notification:", error);
        }
    };

    const handleSavePenaltyCatalog = async (newCatalog: {[key: string]: number}) => {
        try {
            await setDoc(doc(db, 'app-data', 'penalty-catalog'), { penalties: newCatalog }, { merge: true });
            showToast('Strafenkatalog erfolgreich gespeichert.');
            setIsPenaltyCatalogOpen(false);
        } catch (error) {
            console.error("Error saving penalty catalog:", error);
            showToast('Fehler beim Speichern des Katalogs.', 'undo');
        }
    };
    
    // --- Edit Mode Handlers ---
    const handleStartEditing = () => {
        setEditableBalances(new Map(playerBalances));
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setIsEditing(false);
        setEditableBalances(null);
    };
    
    const handleEditableBalanceChange = (userId: string, field: 'regular' | 'discounted' | 'paid', value: string) => {
        let numericValue: number;

        if (field === 'paid') {
            // Allow comma for decimals, handle empty string
            numericValue = value === '' ? 0 : parseFloat(value.replace(',', '.'));
        } else {
            numericValue = parseInt(value, 10);
        }
        
        if (isNaN(numericValue) && value !== '') return;

        setEditableBalances((prev: Map<string, PlayerBalance> | null) => {
            if (!prev) return null;
            const newBalances = new Map<string, PlayerBalance>(prev);
            const playerData = newBalances.get(userId);
            if (playerData) {
                // Manually construct the new object to avoid potential spread error with generic/inferred types
                const updatedData: PlayerBalance = {
                    userId: playerData.userId,
                    name: playerData.name,
                    regular: playerData.regular,
                    discounted: playerData.discounted,
                    paid: playerData.paid,
                    balance: playerData.balance,
                };
                // Update the specific field
                (updatedData as any)[field] = isNaN(numericValue) ? 0 : numericValue;
                
                // Recalculate balance live
                const debt = (updatedData.regular * prices.regular) + (updatedData.discounted * prices.discounted);
                updatedData.balance = debt - updatedData.paid;

                newBalances.set(userId, updatedData);
                return newBalances;
            }
            return prev;
        });
    };

    const handleSaveEdits = async () => {
        if (!editableBalances || !userProfile) return;
    
        const collectionRef = collection(db, BEER_LIST_COLLECTION, DEFAULT_TEAM_FOR_ENTRIES, 'entries');
        const batchPromises: Promise<any>[] = [];
        
        const coachProfile = allUsers.find(u => u.uid === userProfile.uid);
        const coachDisplayName = (coachProfile ?
            ([coachProfile.firstName, coachProfile.lastName].filter(Boolean).join(' ') || coachProfile.displayName) :
            userProfile.displayName
        ) || 'Trainer';
    
        for (const [userId, editedData] of editableBalances.entries()) {
            const originalData = playerBalances.get(userId);
            if (!originalData) continue;
            
            const regularDelta = editedData.regular - originalData.regular;
            const discountedDelta = editedData.discounted - originalData.discounted;
            const paidDelta = editedData.paid - originalData.paid;
    
            // If there are changes in drinks
            if (regularDelta !== 0 || discountedDelta !== 0) {
                const drinkPayload: Omit<BeerListEntry, 'id'> = {
                    type: 'drink',
                    userId,
                    userName: editedData.name,
                    team: DEFAULT_TEAM_FOR_ENTRIES,
                    timestamp: serverTimestamp(),
                    notes: 'Korrektur durch Trainer',
                };
                if (regularDelta !== 0) {
                    (drinkPayload as any).regularDrinks = regularDelta;
                }
                if (discountedDelta !== 0) {
                    (drinkPayload as any).discountedDrinks = discountedDelta;
                }

                batchPromises.push(addDoc(collectionRef, drinkPayload));
            }
    
            // If there are changes in payments
            if (paidDelta !== 0) {
                const paymentPayload: Omit<BeerListEntry, 'id'> = {
                    type: 'payment',
                    userId,
                    userName: editedData.name,
                    amount: paidDelta,
                    payerId: userProfile.uid,
                    payerName: coachDisplayName,
                    team: DEFAULT_TEAM_FOR_ENTRIES,
                    timestamp: serverTimestamp(),
                    notes: 'Korrektur durch Trainer'
                };
                batchPromises.push(addDoc(collectionRef, paymentPayload));
            }
        }
        
        if (batchPromises.length > 0) {
            try {
                await Promise.all(batchPromises);
                showToast(`Änderungen gespeichert.`, 'success');
            } catch (error) {
                console.error("Error saving corrections:", error);
                showToast('Fehler beim Speichern der Korrekturen.', 'undo');
            }
        }
    
        setIsEditing(false);
        setEditableBalances(null);
    };

    const totalTeamBalance = useMemo(() => {
        const source = isEditing && editableBalances ? editableBalances : playerBalances;
        return Array.from(source.values()).reduce((total: number, data: PlayerBalance) => total + data.balance, 0);
    }, [playerBalances, editableBalances, isEditing]);
    
    const myBalanceData = userProfile ? playerBalances.get(userProfile.uid) : undefined;
    const myEntries = userProfile ? entries.filter(e => e.userId === userProfile.uid) : [];
    const myName = userProfile ? (playerBalances.get(userProfile.uid)?.name || userProfile.displayName) : '';
    const displayedEntries = showAllTransactions ? myEntries : myEntries.slice(0, 10);

    const renderTransactionRow = (entry: BeerListEntry) => {
        let description = '';
        let amount = 0;
        let isPayment = false;

        if (entry.type === 'drink') {
            const regCost = (entry.regularDrinks || 0) * prices.regular;
            const discCost = (entry.discountedDrinks || 0) * prices.discounted;
            amount = -(regCost + discCost);
            // FIX: Refactored description generation to be more concise and robust,
            // avoiding potential "Spread types may only be created from object types" errors.
            description = [
                entry.notes,
                entry.regularDrinks && `${entry.regularDrinks} Normal`,
                entry.discountedDrinks && `${entry.discountedDrinks} Ermäßigt`,
            ].filter(Boolean).join(' / ');
        } else if (entry.type === 'payment') {
            isPayment = true;
            amount = entry.amount || 0;
            description = `Zahlung (verbucht von ${entry.payerName || 'Trainer'})`;
        }

        return (
             <tr key={entry.id} className="border-b border-gray-700">
                <td className="p-3 text-gray-400">{entry.timestamp ? format(entry.timestamp.toDate(), 'dd.MM.yy HH:mm', { locale: de }) : '-'}</td>
                <td className="p-3">{description}</td>
                <td className={`p-3 text-right font-semibold ${isPayment ? 'text-green-400' : 'text-red-400'}`}>
                    {isPayment ? '+' : ''}{amount.toFixed(2)}€
                </td>
            </tr>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold mb-6 transition-colors">
                    <ArrowLeftIcon />
                    <span>Zurück zur Übersicht</span>
                </button>
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
                    <div>
                        <h1 className="font-teko text-4xl">Bierliste</h1>
                         <p className="text-gray-400 flex items-center gap-2">
                            Preis: Normal {prices.regular.toFixed(2)}€ / Ermäßigt {prices.discounted.toFixed(2)}€
                            {isCoach && (
                                <button onClick={() => setIsPriceModalOpen(true)} className="text-gray-400 hover:text-white" title="Preise bearbeiten">
                                    <PencilSquareIcon />
                                </button>
                            )}
                        </p>
                    </div>
                    {isCoach && viewMode === 'overview' && !isEditing && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button 
                                onClick={() => setIsPenaltyCatalogOpen(true)} 
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold whitespace-nowrap"
                            >
                                Strafenkatalog
                            </button>
                            <button 
                                onClick={handleSendReminder} 
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold whitespace-nowrap"
                            >
                                Erinnerung: Striche eintragen
                            </button>
                        </div>
                    )}
                </header>
                
                {isCoach && (
                    <div className="mb-6">
                        <div className="border-b border-gray-700">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setViewMode('overview')} className={`${viewMode === 'overview' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                    Gesamtübersicht
                                </button>
                                <button onClick={() => setViewMode('personal')} className={`${viewMode === 'personal' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                    Mein Konto
                                </button>
                            </nav>
                        </div>
                    </div>
                )}


                {loading ? <div className="text-center py-10">Lade Daten...</div>
                : availableTeams.length === 0 ? <div className="text-center py-10 bg-gray-800 rounded-lg"><p className="text-gray-400">Kein Team ausgewählt oder verfügbar.</p></div>
                : (
                    <>
                    { viewMode === 'overview' && (
                        <div className="bg-gray-800 rounded-xl shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-700 text-gray-300">
                                        <tr>
                                            <th className="p-4 text-left">Spieler</th>
                                            <th className="p-4 text-center">Normal</th>
                                            <th className="p-4 text-center">Ermäßigt</th>
                                            <th className="p-4 text-center">Schulden</th>
                                            <th className="p-4 text-center">Gezahlt</th>
                                            <th className="p-4 text-center">Offen</th>
                                            {isCoach && 
                                                <th className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={handleCancelEditing} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-md text-xs font-semibold">Abbrechen</button>
                                                                <button onClick={handleSaveEdits} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-xs font-semibold">Speichern</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={handleStartEditing} title="Tabelle bearbeiten" className="text-gray-400 hover:text-white">
                                                                    <PencilSquareIcon />
                                                                </button>
                                                                <span>Aktionen</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </th>
                                            }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from((isEditing && editableBalances ? editableBalances : playerBalances).values()).sort((a: PlayerBalance,b: PlayerBalance) => a.name.localeCompare(b.name)).map((playerData: PlayerBalance) => {
                                            const debt = (playerData.regular * prices.regular) + (playerData.discounted * prices.discounted);
                                            return (
                                                <tr key={playerData.userId} className="border-b border-gray-700 hover:bg-gray-700/30">
                                                    <td className="p-4 font-medium text-white">{playerData.name}</td>
                                                    <td className="p-4 text-center">
                                                        {isEditing ? (
                                                            <input type="number" min="0" value={playerData.regular} onChange={(e) => handleEditableBalanceChange(playerData.userId, 'regular', e.target.value)} className="w-16 bg-gray-600/50 border border-gray-500 rounded-md py-1 px-2 text-white text-center" />
                                                        ) : (playerData.regular)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {isEditing ? (
                                                            <input type="number" min="0" value={playerData.discounted} onChange={(e) => handleEditableBalanceChange(playerData.userId, 'discounted', e.target.value)} className="w-16 bg-gray-600/50 border border-gray-500 rounded-md py-1 px-2 text-white text-center" />
                                                        ) : (playerData.discounted)}
                                                    </td>
                                                    <td className="p-4 text-center">{debt.toFixed(2)}€</td>
                                                    <td className="p-4 text-center text-green-400">
                                                        {isEditing ? (
                                                            <input type="number" step="0.01" min="0" value={playerData.paid} onChange={(e) => handleEditableBalanceChange(playerData.userId, 'paid', e.target.value)} className="w-20 bg-gray-600/50 border border-gray-500 rounded-md py-1 px-2 text-white text-center" />
                                                        ) : (playerData.paid.toFixed(2) + '€')}
                                                    </td>
                                                    <td className={`p-4 text-center font-bold ${playerData.balance > 0.001 ? 'text-red-400' : 'text-green-400'}`}>{playerData.balance.toFixed(2)}€</td>
                                                    {isCoach && (
                                                        <td className="p-4">
                                                            {!isEditing && (
                                                                <div className="flex justify-end items-center gap-2 flex-wrap">
                                                                    <div className="flex items-stretch gap-0">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Betrag"
                                                                            value={paymentAmounts[playerData.userId] || ''}
                                                                            onChange={(e) => handlePaymentAmountChange(playerData.userId, e.target.value)}
                                                                            className="w-24 bg-gray-700 border border-gray-600 rounded-l-md py-2 px-2 text-white text-right text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                                            aria-label={`Zahlungsbetrag für ${playerData.name}`}
                                                                        />
                                                                        <button 
                                                                            onClick={() => handleAddPayment(playerData)} 
                                                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-r-md text-sm font-semibold whitespace-nowrap transition-transform transform active:scale-95"
                                                                        >
                                                                            Zahlen
                                                                        </button>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => openPenaltyModal(playerData.userId, playerData.name)} 
                                                                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-semibold whitespace-nowrap"
                                                                    >
                                                                        Strafe
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-700 font-bold">
                                        <tr>
                                            <td className="p-4 text-left" colSpan={isCoach ? 5 : 5}>Gesamt</td>
                                            <td className={`p-4 text-center ${totalTeamBalance > 0.001 ? 'text-red-400' : 'text-green-400'}`}>{totalTeamBalance.toFixed(2)}€</td>
                                            {isCoach && <td></td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    { viewMode === 'personal' && userProfile && (
                        <div>
                           <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                                <h2 className="font-teko text-3xl mb-4">Deine Abrechnung</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-gray-400">Getränke (N)</p>
                                        <p className="font-teko text-4xl">{myBalanceData?.regular || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Getränke (E)</p>
                                        <p className="font-teko text-4xl">{myBalanceData?.discounted || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Gezahlt</p>
                                        <p className="font-teko text-4xl text-green-400">{(myBalanceData?.paid || 0).toFixed(2)}€</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Kontostand</p>
                                        <p className={`font-teko text-4xl ${(myBalanceData?.balance || 0) > 0.001 ? 'text-red-400' : 'text-green-400'}`}>{(myBalanceData?.balance || 0).toFixed(2)}€</p>
                                    </div>
                                </div>
                            </div>
                             <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                                <h2 className="font-teko text-3xl mb-4">Getränk eintragen</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Normales Getränk</span>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleDrinkQuantityChange('regular', -1)} className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition">-</button>
                                            <span className="font-teko text-4xl w-10 text-center">{drinksToAdd.regular}</span>
                                            <button onClick={() => handleDrinkQuantityChange('regular', 1)} className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition">+</button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Ermäßigtes Getränk</span>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleDrinkQuantityChange('discounted', -1)} className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition">-</button>
                                            <span className="font-teko text-4xl w-10 text-center">{drinksToAdd.discounted}</span>
                                            <button onClick={() => handleDrinkQuantityChange('discounted', 1)} className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition">+</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <button onClick={handleConfirmAddDrinks} disabled={drinksToAdd.regular === 0 && drinksToAdd.discounted === 0} className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
                                        Getränke hinzufügen
                                    </button>
                                </div>
                            </div>
                             <div className="bg-gray-800 rounded-xl shadow-lg">
                                <h3 className="font-teko text-2xl p-4 border-b border-gray-700">Deine Buchungen</h3>
                                {myEntries.length > 0 ? (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="text-left text-gray-400">
                                                    <tr><th className="p-3">Datum</th><th className="p-3">Beschreibung</th><th className="p-3 text-right">Betrag</th></tr>
                                                </thead>
                                                <tbody>{displayedEntries.map(renderTransactionRow)}</tbody>
                                            </table>
                                        </div>
                                        {myEntries.length > 10 && (
                                            <div className="p-4 border-t border-gray-700 text-center">
                                                <button
                                                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                                                    className="text-orange-400 hover:text-orange-300 font-semibold text-sm transition-colors"
                                                >
                                                    {showAllTransactions ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="p-6 text-center text-gray-400">Du hast noch keine Buchungen in diesem Team.</p>
                                )}
                            </div>
                        </div>
                    )}
                    </>
                )}

                <PenaltyModal 
                    isOpen={isPenaltyModalOpen}
                    onClose={() => setIsPenaltyModalOpen(false)}
                    targetName={penaltyTarget?.name || null}
                    onSave={handleSavePenalty}
                    penaltyReasons={PENALTY_REASONS}
                    penaltyCatalog={penaltyCatalog}
                    beerPrice={prices.regular}
                />
                 <PriceEditModal
                    isOpen={isPriceModalOpen}
                    onClose={() => setIsPriceModalOpen(false)}
                    currentPrices={prices}
                    onSave={handleSavePrices}
                />
                 <PenaltyCatalogModal
                    isOpen={isPenaltyCatalogOpen}
                    onClose={() => setIsPenaltyCatalogOpen(false)}
                    onSave={handleSavePenaltyCatalog}
                    initialCatalog={penaltyCatalog}
                    beerPrice={prices.regular}
                    penaltyReasons={PENALTY_REASONS}
                />
            </div>
        </div>
    );
};

export default BeerList;