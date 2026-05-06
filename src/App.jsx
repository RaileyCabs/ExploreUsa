import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import './App.css';
import { states } from './states';
import USAMap from './components/USAMap';
import StatsBar from './components/StatsBar';
import BottomNav from './components/BottomNav';
import VisitModal from './components/VisitModal';
import JournalPage from './components/JournalPage';
import ProfilePage from './components/ProfilePage';
import { auth, db, googleProvider } from './firebase';

function App() {
  const [visits, setVisits] = useState([]);
  const preloadedFlagsRef = useRef(new Set());

  const [selectedState, setSelectedState] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setVisits([]);
      return;
    }
    const visitsRef = collection(db, 'users', user.uid, 'visits');
    const unsubscribe = onSnapshot(visitsRef, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setVisits(loaded);
    });
    return () => unsubscribe();
  }, [user]);

  const visitedStates = [...new Set(visits.map(v => v.stateCode))];
  const visitedCount = visitedStates.length;
  const totalTrips = visits.length;
  const averageRating = totalTrips > 0
    ? (visits.reduce((sum, v) => sum + v.rating, 0) / totalTrips).toFixed(1)
    : 0;

  const preloadFlag = (stateCode) => {
    const code = (stateCode || '').toLowerCase();
    if (!code || preloadedFlagsRef.current.has(code)) {
      return;
    }

    preloadedFlagsRef.current.add(code);
    const img = new Image();
    img.decoding = 'async';
    img.src = `/flags/${code}.svg`;
  };

  useEffect(() => {
    visitedStates.forEach((code) => preloadFlag(code));
  }, [visitedStates]);

  useEffect(() => {
    let cancelled = false;
    let idleId = null;
    let timeoutId = null;
    const queue = states.map((state) => state.code?.toLowerCase()).filter(Boolean);

    const runBatch = () => {
      if (cancelled || queue.length === 0) {
        return;
      }

      // Keep each batch small so startup interactivity remains snappy.
      const batchSize = 4;
      const batch = queue.splice(0, batchSize);
      batch.forEach((code) => preloadFlag(code));

      if (queue.length === 0) {
        return;
      }

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(runBatch, { timeout: 1200 });
      } else {
        timeoutId = window.setTimeout(runBatch, 120);
      }
    };

    // Delay kickoff slightly so initial render and map setup win first.
    timeoutId = window.setTimeout(runBatch, 500);

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleStateClick = (state) => {
    preloadFlag(state?.code);
    setSelectedState(state);
    setShowModal(true);
  };

  const handleSaveVisit = async (newVisit) => {
    if (!user) return;
    setSaveError('');
    try {
      const { id: _id, ...visitData } = newVisit;
      const visitsRef = collection(db, 'users', user.uid, 'visits');
      await addDoc(visitsRef, visitData);
      setShowModal(false);
      setSelectedState(null);
    } catch (err) {
      setSaveError('Could not save trip. Make sure Firestore is enabled in your Firebase Console, then try again.');
      console.error('Firestore save error:', err);
    }
  };

  const handleDeleteVisit = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'visits', id));
    } catch (err) {
      console.error('Firestore delete error:', err);
    }
  };

  const handleUpdateVisit = async (updatedVisit) => {
    if (!user) return;
    try {
      const { id, ...data } = updatedVisit;
      await updateDoc(doc(db, 'users', user.uid, 'visits', id), data);
    } catch (err) {
      console.error('Firestore update error:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = error?.code || '';
      if (code === 'auth/configuration-not-found') {
        setAuthError('Google sign-in is not enabled in Firebase yet. Enable Google in Firebase Auth -> Sign-in method.');
        return;
      }
      setAuthError(error?.message || 'Sign-in failed. Please try again.');
    }
  };

  const handleSignOut = async () => {
    setAuthError('');
    try {
      await signOut(auth);
    } catch (error) {
      setAuthError(error?.message || 'Sign-out failed. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>ExploreUSA</h1>
          <p>Checking your login...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Welcome to ExploreUSA</h1>
          <p className="auth-subtitle">Track every state you've explored across the USA.</p>
          <p className="auth-note">Sign in or create a free account using your Google account.</p>
          <button type="button" className="google-signin-btn" onClick={handleGoogleSignIn}>
            <svg className="google-icon" viewBox="0 0 48 48" width="20" height="20">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
          <p className="auth-fine-print">New users will automatically get a free account on first sign-in.</p>
          {authError && <p className="auth-error">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <span className="brand-text">ExploreUSA</span>
          <div className="header-user">
            <span className="header-user-name">{user.displayName || user.email}</span>
            <button type="button" className="header-signout-btn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        {authError && <p className="auth-error in-app">{authError}</p>}

        <StatsBar
          visitedCount={visitedCount}
          averageRating={averageRating}
          totalTrips={totalTrips}
        />

        <Routes>
          <Route path="/" element={
            <main className="map-page">
              <USAMap
                states={states}
                visitedStates={visitedStates}
                onStateClick={handleStateClick}
              />
            </main>
          } />
          <Route path="/journal" element={
            <JournalPage
              visits={visits}
              onDelete={handleDeleteVisit}
              onUpdateVisit={handleUpdateVisit}
            />
          } />
          <Route path="/profile" element={
            <ProfilePage visits={visits} user={user} />
          } />
        </Routes>

        <BottomNav />

        {showModal && (
          <VisitModal
            state={selectedState}
            onClose={() => { setShowModal(false); setSaveError(''); }}
            onSave={handleSaveVisit}
            saveError={saveError}
          />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;