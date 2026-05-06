import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { states } from './states';
import USAMap from './components/USAMap';
import StatsBar from './components/StatsBar';
import BottomNav from './components/BottomNav';
import VisitModal from './components/VisitModal';
import JournalPage from './components/JournalPage';
import ProfilePage from './components/ProfilePage';

function App() {
  const [visits, setVisits] = useState(() => {
    const saved = localStorage.getItem('travelVisits');
    return saved ? JSON.parse(saved) : [];
  });
  const preloadedFlagsRef = useRef(new Set());

  const [selectedState, setSelectedState] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('travelVisits', JSON.stringify(visits));
  }, [visits]);

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

  const handleSaveVisit = (newVisit) => {
    setVisits((prev) => [{ ...newVisit, id: Date.now() }, ...prev]);
    setShowModal(false);
    setSelectedState(null);
  };

  const handleDeleteVisit = (id) => {
    setVisits((prev) => prev.filter((visit) => visit.id !== id));
  };

  const handleUpdateVisitNotes = (id, notes) => {
    setVisits((prev) => prev.map((visit) => (
      visit.id === id ? { ...visit, notes } : visit
    )));
  };

  const handleUpdateVisit = (updatedVisit) => {
    setVisits((prev) => prev.map((visit) =>
      visit.id === updatedVisit.id ? updatedVisit : visit
    ));
  };

  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <span className="brand-text">ExploreUSA</span>
        </header>

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
            <ProfilePage visits={visits} />
          } />
        </Routes>

        <BottomNav />

        {showModal && (
          <VisitModal
            state={selectedState}
            onClose={() => setShowModal(false)}
            onSave={handleSaveVisit}
          />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;