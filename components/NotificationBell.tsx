
import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, writeBatch, arrayUnion } from 'firebase/firestore';
import { UserProfile, Notification as NotificationType, View, GameState } from '../types';
import { BellIcon } from './Icons';
import { formatRelativeTime } from '../utils/formatTime';

interface NotificationBellProps {
    userProfile: UserProfile;
    onNavigate: (view: View) => void;
    onViewGameSummary: (game: GameState) => void;
    completedGames: GameState[];
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userProfile, onNavigate, onViewGameSummary, completedGames }) => {
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const db = getFirestore();
        const notificationMap = new Map<string, NotificationType>();

        const handleSnapshot = () => {
            const combinedNotifications = Array.from(notificationMap.values());
            combinedNotifications.sort((a, b) => {
                const timeA = a.timestamp?.seconds || 0;
                const timeB = b.timestamp?.seconds || 0;
                return timeB - timeA;
            });
            setNotifications(combinedNotifications);
        };

        // Query for role-based notifications
        const roleQuery = query(
            collection(db, "notifications"),
            where("targetRoles", "array-contains", userProfile.role)
        );
        const unsubscribeRole = onSnapshot(roleQuery, (querySnapshot) => {
            querySnapshot.docs.forEach((doc) => {
                notificationMap.set(doc.id, { id: doc.id, ...doc.data() } as NotificationType);
            });
            handleSnapshot();
        });

        // Query for UID-based notifications
        const uidQuery = query(
            collection(db, "notifications"),
            where("targetUids", "array-contains", userProfile.uid)
        );
        const unsubscribeUid = onSnapshot(uidQuery, (querySnapshot) => {
            querySnapshot.docs.forEach((doc) => {
                notificationMap.set(doc.id, { id: doc.id, ...doc.data() } as NotificationType);
            });
            handleSnapshot();
        });

        return () => {
            unsubscribeRole();
            unsubscribeUid();
        };
    }, [userProfile.role, userProfile.uid]);

    const unreadCount = notifications.filter(n => !n.readBy.includes(userProfile.uid)).length;

    const handleMarkAsRead = async () => {
        const unreadNotifications = notifications.filter(n => !n.readBy.includes(userProfile.uid));
        if (unreadNotifications.length === 0) return;

        const db = getFirestore();
        const batch = writeBatch(db);

        unreadNotifications.forEach(notification => {
            const notifRef = doc(db, "notifications", notification.id);
            batch.update(notifRef, {
                readBy: arrayUnion(userProfile.uid)
            });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error marking notifications as read: ", error);
        }
    };
    
    const toggleDropdown = () => {
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);
        if (newIsOpen && unreadCount > 0) {
            setTimeout(handleMarkAsRead, 500);
        }
    };

    const handleNotificationClick = (notification: NotificationType) => {
        setIsOpen(false);

        if (notification.type === 'newGame' && notification.linkTo === 'summary' && notification.linkToParams?.gameId) {
            const gameId = parseInt(notification.linkToParams.gameId, 10);
            const game = completedGames.find(g => g.gameId === gameId);
            if (game) {
                onViewGameSummary(game);
            } else {
                alert("Spiel nicht gefunden. Es wurde möglicherweise gelöscht oder noch nicht für dich freigegeben.");
                onNavigate('home');
            }
            return;
        }

        const targetView = notification.linkTo;
        if (targetView) {
            onNavigate(targetView);
        } else if (notification.type === 'newUser') {
            onNavigate('userManagement');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={toggleDropdown} className="relative text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700">
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20">
                    <div className="p-3 border-b border-gray-600">
                        <h3 className="font-semibold text-white">Benachrichtigungen</h3>
                    </div>
                    <ul className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(notification => (
                                <li 
                                    key={notification.id} 
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-3 border-b border-gray-700/50 transition-colors 
                                        ${!notification.readBy.includes(userProfile.uid) ? 'bg-orange-900/40' : 'hover:bg-gray-700/50'}
                                        ${notification.linkTo ? 'cursor-pointer' : ''}
                                    `}>
                                    <p className="text-sm text-gray-200">{notification.message}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-gray-400">{formatRelativeTime(notification.timestamp)}</p>
                                        {notification.linkTo && (
                                            <span className="text-xs text-orange-400 font-semibold">Anzeigen &rarr;</span>
                                        )}
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="p-4 text-center text-sm text-gray-400">Keine neuen Benachrichtigungen.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
