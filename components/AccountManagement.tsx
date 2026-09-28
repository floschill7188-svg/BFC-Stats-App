import React, { useState } from 'react';
import { User, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ArrowLeftIcon } from './Icons';
import { ToastType } from './ToastNotification';

interface AccountManagementProps {
  currentUser: User;
  onBack: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

const AccountManagement: React.FC<AccountManagementProps> = ({ currentUser, onBack, showToast }) => {
  // States for Display Name
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [displayNameLoading, setDisplayNameLoading] = useState(false);

  // States for Email
  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // States for Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim() === currentUser.displayName) return;
    setDisplayNameLoading(true);
    try {
      await updateProfile(currentUser, { displayName: displayName.trim() });
      showToast('Anzeigename erfolgreich aktualisiert.');
    } catch (error) {
      console.error(error);
      showToast('Fehler beim Aktualisieren des Namens.', 'undo');
    } finally {
      setDisplayNameLoading(false);
    }
  };
  
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!newEmail || !currentPasswordForEmail) {
      setEmailError('Alle Felder sind erforderlich.');
      return;
    }
    setEmailLoading(true);

    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPasswordForEmail);
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, newEmail);
      showToast('E-Mail-Adresse erfolgreich geändert.');
      setNewEmail('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        setEmailError('Das aktuelle Passwort ist falsch.');
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('Diese E-Mail-Adresse wird bereits verwendet.');
      } else {
        setEmailError('Ein Fehler ist aufgetreten.');
        console.error(error);
      }
    } finally {
      setCurrentPasswordForEmail('');
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Alle Felder sind erforderlich.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    setPasswordLoading(true);

    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      showToast('Passwort erfolgreich geändert.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Das aktuelle Passwort ist falsch.');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('Das neue Passwort ist zu schwach (mind. 6 Zeichen).');
      } else {
        setPasswordError('Ein Fehler ist aufgetreten.');
        console.error(error);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderCard = (title: string, children: React.ReactNode) => (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="font-teko text-3xl text-white mb-4">{title}</h2>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <button
            onClick={onBack}
            className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold mb-6 transition-colors"
            aria-label="Zurück zum Dashboard"
        >
            <ArrowLeftIcon />
            <span>Zurück zum Dashboard</span>
        </button>

        <div className="space-y-8">
          {/* Display Name Card */}
          {renderCard('Anzeigename Ändern', (
            <form onSubmit={handleUpdateDisplayName} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-300">Benutzername</label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Dein Anzeigename"
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="text-right">
                <button
                  type="submit"
                  disabled={displayNameLoading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {displayNameLoading ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          ))}
          
          {/* Email Card */}
          {currentUser.providerData.some(p => p.providerId === 'password') && renderCard('E-Mail Ändern', (
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-300">Neue E-Mail-Adresse</label>
                <input type="email" id="newEmail" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label htmlFor="currentPasswordForEmail" className="block text-sm font-medium text-gray-300">Aktuelles Passwort (zur Bestätigung)</label>
                <input type="password" id="currentPasswordForEmail" value={currentPasswordForEmail} onChange={e => setCurrentPasswordForEmail(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
              <div className="text-right">
                <button type="submit" disabled={emailLoading} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  {emailLoading ? 'Aktualisieren...' : 'E-Mail Aktualisieren'}
                </button>
              </div>
            </form>
          ))}

          {/* Password Card */}
           {currentUser.providerData.some(p => p.providerId === 'password') && renderCard('Passwort Ändern', (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300">Aktuelles Passwort</label>
                <input type="password" id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
               <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">Neues Passwort</label>
                <input type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
               <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-300">Neues Passwort Bestätigen</label>
                <input type="password" id="confirmNewPassword" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
              <div className="text-right">
                <button type="submit" disabled={passwordLoading} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                    {passwordLoading ? 'Ändern...' : 'Passwort Ändern'}
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountManagement;
