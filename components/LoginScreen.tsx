import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { auth, db } from '../firebase'; // Import from the new central file

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.248l-5.657,5.657C0.252,21.35,0,22.659,0,24c0,11.045,8.955,20,20,20v-4c-8.837,0-16-7.163-16-16C4,22.366,4.465,20.833,5.166,19.479L6.306,14.248z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C41.38,36.106,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


interface LoginScreenProps {
  onDemoLogin?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onDemoLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setUnauthorizedDomain(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged in App.tsx will handle profile and navigation
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const currentHost = window.location.hostname;
        setUnauthorizedDomain(currentHost);
        setError(`Die Domain "${currentHost}" ist im Firebase-Projekt noch nicht autorisiert.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Das Anmeldefenster wurde geschlossen.');
      } else {
        setError('Fehler bei der Google-Anmeldung: ' + (err.message || 'Bitte erneut versuchen.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnauthorizedDomain(null);

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Registration Logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 1. Update Firebase Auth Profile
        await updateProfile(user, { displayName });

        // 2. Create Firestore User Document
        const userRef = doc(db, "users", user.uid);
        const newUserProfile: Omit<UserProfile, 'uid'> = {
            email: user.email || '',
            displayName: displayName,
            firstName: firstName,
            lastName: lastName,
            role: 'Trainer', // Standardmäßig Trainer für Erstbenutzer
            playerTeams: [],
        };
        await setDoc(userRef, newUserProfile);

        // 3. Create Notification for Trainers
        const notificationsCollection = collection(db, "notifications");
        await addDoc(notificationsCollection, {
            type: 'newUser',
            message: `${displayName || 'Ein neuer Benutzer'} hat sich registriert.`,
            timestamp: serverTimestamp(),
            readBy: [],
            targetRoles: ['Trainer'],
            relatedUid: user.uid,
            linkTo: 'userManagement',
        });
      }
      // onAuthStateChanged in App.tsx will handle the rest
    } catch (err: any) {
      console.error("Auth action error:", err);
      switch (err.code) {
        case 'auth/unauthorized-domain': {
          const currentHost = window.location.hostname;
          setUnauthorizedDomain(currentHost);
          setError(`Die Domain "${currentHost}" ist in Firebase noch nicht autorisiert.`);
          break;
        }
        case 'auth/invalid-email':
          setError('Bitte gib eine gültige E-Mail-Adresse ein.');
          break;
        case 'auth/user-not-found':
          setError('Kein Benutzer mit dieser E-Mail-Adresse gefunden.');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Ungültige Anmeldedaten (E-Mail oder Passwort falsch).');
          break;
        case 'auth/email-already-in-use':
          setError('Diese E-Mail-Adresse wird bereits verwendet.');
          break;
        case 'auth/weak-password':
          setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
          break;
        default:
          setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-xl shadow-lg p-8 mt-4">
          <h1 className="font-teko text-5xl text-center text-white mb-2">
            {isLoginView ? 'Willkommen zurück' : 'Account Erstellen'}
          </h1>
          <p className="text-center text-gray-400 mb-8">
            {isLoginView ? 'Melde dich an, um fortzufahren.' : 'Registriere dich, um loszulegen.'}
          </p>
          <div className="space-y-6">
             <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-gray-600 rounded-md shadow-sm text-lg font-medium text-gray-800 bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800 disabled:opacity-50"
              >
                <GoogleIcon />
                Mit Google anmelden
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">ODER</span>
                </div>
            </div>

            <form onSubmit={handleAuthAction} className="space-y-6">
                {!isLoginView && (
                    <>
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300">Anzeigename</label>
                            <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">Vorname</label>
                                <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300">Nachname</label>
                                <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            </div>
                        </div>
                    </>
                )}
                <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    E-Mail-Adresse
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                </div>
                <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Passwort
                </label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                </div>
                
                {unauthorizedDomain && (
                    <div className="p-4 bg-amber-950/70 border border-amber-500 rounded-lg text-amber-200 text-sm space-y-2.5">
                        <div className="flex items-center gap-2 text-white font-bold">
                            <span className="text-lg">⚠️</span>
                            <span>Firebase: Domain nicht autorisiert</span>
                        </div>
                        <p className="text-xs text-amber-100 leading-relaxed">
                            Google-Login blockiert Domains, die im Firebase-Projekt noch nicht eingetragen sind. Bitte füge diese Domain hinzu:
                        </p>
                        <div className="flex items-center justify-between gap-2 bg-gray-900/90 p-2 rounded border border-gray-700 font-mono text-xs text-white">
                            <span className="truncate">{unauthorizedDomain}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(unauthorizedDomain);
                                    setCopiedDomain(true);
                                    setTimeout(() => setCopiedDomain(false), 2500);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-sans font-semibold shrink-0"
                            >
                                {copiedDomain ? '✓ Kopiert' : 'Domain kopieren'}
                            </button>
                        </div>
                        <div className="text-[11px] text-gray-300 space-y-1">
                            <p>
                                <strong>Schritte zur Behebung:</strong><br />
                                1. Öffne die <a href="https://console.firebase.google.com/project/bfc-stats-app/authentication/settings" target="_blank" rel="noreferrer" className="text-orange-400 underline font-semibold">Firebase Console &gt; Authentication &gt; Einstellungen</a><br />
                                2. Unter <strong>Autorisierte Domains</strong> &gt; <strong>Domain hinzufügen</strong> die kopierte Domain einfügen.
                            </p>
                        </div>
                        <div className="pt-2 border-t border-amber-800/60 text-xs text-white font-medium">
                            💡 Schneller Einstieg: Nutze unten einfach <strong>E-Mail &amp; Passwort</strong> (funktioniert sofort ohne Domain-Freigabe)!
                        </div>
                    </div>
                )}

                {error && !unauthorizedDomain && (
                    <div className="text-center p-3 bg-red-900/50 border border-red-700 rounded-md">
                        <p className="text-red-300 font-semibold text-sm">{error}</p>
                    </div>
                )}

                <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-gray-800 disabled:opacity-50"
                >
                    {loading && !isLoginView ? 'Registriere...' : loading && isLoginView ? 'Melde an...' : (isLoginView ? 'Anmelden' : 'Registrieren')}
                </button>
                </div>
            </form>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError('');
                setUnauthorizedDomain(null);
              }}
              className="text-sm text-orange-400 hover:text-orange-300"
            >
              {isLoginView ? 'Noch keinen Account? Registrieren' : 'Bereits einen Account? Anmelden'}
            </button>

            {onDemoLogin && (
              <button
                type="button"
                onClick={onDemoLogin}
                className="mt-2 text-xs py-2 px-4 rounded-lg bg-gray-700/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-600 transition-colors"
                title="Direkt ohne Login im Demo-Modus als Trainer starten"
              >
                🏀 Als Trainer testen (Demo / Schnellzugriff)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// FIX: Added a default export for the LoginScreen component.
export default LoginScreen;