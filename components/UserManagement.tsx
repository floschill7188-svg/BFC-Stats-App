import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole, PlayerSubgroup, MasterRosterPlayer } from '../types';
import { ArrowLeftIcon, LockClosedIcon } from './Icons';
import { ToastType } from './ToastNotification';

interface UserManagementProps {
    currentUser: UserProfile;
    onBack: () => void;
    showToast: (message: string, type?: ToastType) => void;
    roster: MasterRosterPlayer[];
}

const ROLES: UserRole[] = ['Trainer', 'CoTrainer', 'Spieler'];
const TEAMS: PlayerSubgroup[] = ['BFC U18', 'BFC Herren 1', 'BFC Herren 2'];

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onBack, showToast, roster }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    
    // State for the user currently being edited
    const [editableUser, setEditableUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        setLoading(true);
        const usersCollection = collection(db, "users");
        const q = query(usersCollection);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
            usersList.sort((a, b) => {
                const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.displayName || '';
                const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.displayName || '';
                return nameA.localeCompare(nameB);
            });
            setUsers(usersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            showToast("Fehler beim Laden der Benutzer.", 'undo');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [showToast]);

    const startEditing = (user: UserProfile) => {
        setEditingUserId(user.uid);
        // Create a deep copy for editing to avoid mutating state directly
        setEditableUser(JSON.parse(JSON.stringify(user)));
    };

    const cancelEditing = () => {
        setEditingUserId(null);
        setEditableUser(null);
    };

    const handleFieldChange = (field: keyof UserProfile, value: any) => {
        if (editableUser) {
            setEditableUser({ ...editableUser, [field]: value });
        }
    };
    
    const handleSaveChanges = async () => {
        if (!editableUser) return;
    
        const userRef = doc(db, "users", editableUser.uid);
        try {
            const { role, linkedRosterPlayerId } = editableUser;
            const displayName = [editableUser.firstName, editableUser.lastName].filter(Boolean).join(' ') || editableUser.displayName;
    
            // Finde die Teams für den verknüpften Spieler aus dem Kader
            const linkedPlayer = roster.find(p => p.id === linkedRosterPlayerId);
            const teamsToSync = linkedPlayer?.teams || []; // Standardmäßig ein leeres Array
    
            await updateDoc(userRef, {
                role,
                linkedRosterPlayerId: linkedRosterPlayerId || null,
                playerTeams: teamsToSync // Teams direkt bei der Verknüpfung synchronisieren
            });
    
            showToast(`Änderungen für ${displayName} gespeichert.`);
            cancelEditing();
        } catch (error) {
            console.error("Error updating user:", error);
            showToast("Fehler beim Speichern der Änderungen.", 'undo');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }
    
    const sortedRoster = [...roster].sort((a,b) => a.name.localeCompare(b.name));

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold mb-6 transition-colors">
                    <ArrowLeftIcon />
                    <span>Zurück zur Übersicht</span>
                </button>
                <h1 className="font-teko text-4xl mb-6">Benutzerverwaltung</h1>

                <div className="bg-gray-800 rounded-xl shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-700 text-gray-300">
                                <tr>
                                    <th className="p-4">Benutzer</th>
                                    <th className="p-4">Rolle</th>
                                    <th className="p-4">Teams (aus Kader)</th>
                                    <th className="p-4">Verknüpfter Spieler</th>
                                    <th className="p-4 text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => {
                                    // Construct full name for consistent display
                                    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.displayName;

                                    return editingUserId === user.uid && editableUser ? (
                                        // Edit Row
                                        <tr key={user.uid} className="bg-gray-700/50 border-b border-gray-700">
                                            <td className="p-4" colSpan={5}>
                                                <h3 className="font-bold text-lg mb-4">{fullName}</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-300 mb-2">Rolle</label>
                                                        <select value={editableUser.role} onChange={e => handleFieldChange('role', e.target.value)} className="w-full bg-gray-600 border border-gray-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    </div>
                                                     <div>
                                                        <label className="block text-sm font-medium text-gray-300 mb-2">Spieler-Profil Verknüpfung</label>
                                                        <select
                                                            value={editableUser.linkedRosterPlayerId ?? ''}
                                                            onChange={e => handleFieldChange('linkedRosterPlayerId', e.target.value ? Number(e.target.value) : null)}
                                                            className="w-full bg-gray-600 border border-gray-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                        >
                                                            <option value="">Keine Verknüpfung</option>
                                                            {sortedRoster.map(p => {
                                                                const linkedUser = users.find(u => u.linkedRosterPlayerId === p.id && u.uid !== editableUser.uid);
                                                                const isDisabled = !!linkedUser;
                                                                const linkedUserName = linkedUser ? ([linkedUser.firstName, linkedUser.lastName].filter(Boolean).join(' ') || linkedUser.displayName) : '';
                                                                return (
                                                                    <option key={p.id} value={p.id} disabled={isDisabled}>
                                                                        {p.name} {isDisabled ? `(verknüpft mit ${linkedUserName})` : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-3 mt-6">
                                                    <button onClick={cancelEditing} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-semibold">Abbrechen</button>
                                                    <button onClick={handleSaveChanges} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">Speichern</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        // View Row
                                        <tr key={user.uid} className="border-b border-gray-700 hover:bg-gray-700/30">
                                            <td className="p-4">
                                                <p className="font-medium text-white">{fullName || user.email}</p>
                                                {fullName && <p className="text-gray-400">{user.email}</p>}
                                            </td>
                                            <td className="p-4">{user.role}</td>
                                            <td className="p-4">
                                                {user.playerTeams?.join(', ') || '-'}
                                            </td>
                                            <td className="p-4">
                                                {user.linkedRosterPlayerId ? roster.find(p => p.id === user.linkedRosterPlayerId)?.name : '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => startEditing(user)} className="px-4 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold">
                                                    Bearbeiten
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;