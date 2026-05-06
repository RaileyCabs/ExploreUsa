import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const LOCKED_BADGES = [
  { id: 'coast-to-coast', label: 'Coast to Coast', desc: 'Log trips in both CA and NY' },
  { id: 'seasoned-traveler', label: 'Seasoned Traveler', desc: 'Complete trips in all 4 seasons' },
];

const ProfilePage = ({ visits, user }) => {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(
    () => user?.displayName || 'Traveler'
  );
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(
    () => user?.email || ''
  );

  useEffect(() => {
    if (!user) return;
    if (!firebaseConfigured) {
      const stored = localStorage.getItem('profile');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.profileName) setNameInput(data.profileName);
        if (data.profileEmail) setEmailInput(data.profileEmail);
      }
      return;
    }
    const profileRef = doc(db, 'users', user.uid);
    getDoc(profileRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.profileName) setNameInput(data.profileName);
        if (data.profileEmail) setEmailInput(data.profileEmail);
      }
    });
  }, [user]);

  const saveName = () => {
    const val = nameInput.trim() || 'Traveler';
    setNameInput(val);
    if (!firebaseConfigured) {
      const stored = JSON.parse(localStorage.getItem('profile') || '{}');
      localStorage.setItem('profile', JSON.stringify({ ...stored, profileName: val }));
    } else if (user) {
      setDoc(doc(db, 'users', user.uid), { profileName: val }, { merge: true });
    }
    setEditingName(false);
  };

  const saveEmail = () => {
    if (!firebaseConfigured) {
      const stored = JSON.parse(localStorage.getItem('profile') || '{}');
      localStorage.setItem('profile', JSON.stringify({ ...stored, profileEmail: emailInput.trim() }));
    } else if (user) {
      setDoc(doc(db, 'users', user.uid), { profileEmail: emailInput.trim() }, { merge: true });
    }
    setEditingEmail(false);
  };

  const stats = useMemo(() => {
    const visitedCodes = [...new Set(visits.map((v) => v.stateCode).filter(Boolean))];
    const totalTrips = visits.length;
    const avgRating = totalTrips > 0
      ? (visits.reduce((s, v) => s + (v.rating || 0), 0) / totalTrips).toFixed(1)
      : '—';

    const dates = visits.map((v) => v.date).filter(Boolean).sort();
    const memberSince = dates.length > 0
      ? new Date(dates[0]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const byState = {};
    visits.forEach((v) => {
      if (!v.stateCode) return;
      if (!byState[v.stateCode]) byState[v.stateCode] = { name: v.stateName, ratings: [], count: 0 };
      byState[v.stateCode].ratings.push(v.rating || 0);
      byState[v.stateCode].count++;
    });
    const topStates = Object.entries(byState)
      .map(([code, d]) => ({
        code, name: d.name, count: d.count,
        avg: d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    const recent = [...visits]
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      })
      .slice(0, 5);

    return { visitedCodes, totalTrips, avgRating, memberSince, topStates, recent };
  }, [visits]);

  const renderStars = (rating) => {
    const r = Math.round(rating);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  return (
    <div className="profile-page">

      {/* User Info Card */}
      <div className="profile-card profile-user-card">
        <div className="profile-user-avatar">
          {(nameInput.trim()[0] || 'T').toUpperCase()}
        </div>
        <div className="profile-user-info">
          {editingName ? (
            <div className="profile-edit-row">
              <input
                className="profile-edit-input"
                value={nameInput}
                autoFocus
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              />
              <button className="profile-edit-save" onClick={saveName}>Save</button>
            </div>
          ) : (
            <div className="profile-name-row">
              <span className="profile-display-name">{nameInput}</span>
              <button className="profile-edit-btn" onClick={() => setEditingName(true)}>Edit</button>
            </div>
          )}
          {editingEmail ? (
            <div className="profile-edit-row">
              <input
                className="profile-edit-input"
                type="email"
                placeholder="your@email.com"
                value={emailInput}
                autoFocus
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEmail(); if (e.key === 'Escape') setEditingEmail(false); }}
              />
              <button className="profile-edit-save" onClick={saveEmail}>Save</button>
            </div>
          ) : (
            <div className="profile-name-row">
              <span className="profile-display-email">
                {emailInput || <span className="profile-placeholder">Add email…</span>}
              </span>
              <button className="profile-edit-btn" onClick={() => setEditingEmail(true)}>Edit</button>
            </div>
          )}
          <span className="profile-member-since">Member since {stats.memberSince}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="profile-stats-row">
        <div className="profile-stat-card">
          <span className="psc-val">{stats.visitedCodes.length}/50</span>
          <span className="psc-lbl">States Visited</span>
        </div>
        <div className="profile-stat-card">
          <span className="psc-val">{stats.avgRating}</span>
          <span className="psc-lbl">Avg Rating</span>
        </div>
        <div className="profile-stat-card">
          <span className="psc-val">{stats.totalTrips}</span>
          <span className="psc-lbl">Total Trips</span>
        </div>
      </div>

      {/* Two-column section */}
      <div className="profile-two-col">
        <div className="profile-card">
          <h3 className="profile-card-title">Top Rated</h3>
          {stats.topStates.length === 0 ? (
            <p className="profile-empty">No visits yet.</p>
          ) : (
            <div className="top-states-list">
              {stats.topStates.map((s, i) => (
                <div key={s.code} className="top-state-row">
                  <span className="top-state-rank">#{i + 1}</span>
                  <div className="top-state-info">
                    <span className="top-state-name">{s.name}</span>
                    <span className="top-state-stars">{renderStars(s.avg)}</span>
                  </div>
                  <span className="top-state-trips">{s.count} trip{s.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="profile-card">
        <h3 className="profile-card-title">Achievements</h3>
        <div className="badges-scroll">
          {LOCKED_BADGES.map((badge) => (
            <div key={badge.id} className="badge-item badge--locked">
              <span className="badge-label">{badge.label}</span>
              <span className="badge-desc">{badge.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trips */}
      <div className="profile-card">
        <h3 className="profile-card-title">Recent Trips</h3>
        {stats.recent.length === 0 ? (
          <p className="profile-empty">No trips yet. <Link to="/">Log your first visit!</Link></p>
        ) : (
          <div className="recent-list">
            {stats.recent.map((v) => (
              <div key={v.id} className="recent-row">
                <div className="recent-left">
                  <span className="recent-state">{v.stateName}</span>
                  <span className="recent-title">{v.title || 'Untitled Trip'}</span>
                  <span className="recent-date">{v.date || 'No date'}</span>
                </div>
                <div className="recent-right">
                  <span className="recent-stars">{renderStars(v.rating || 0)}</span>
                  {v.notes && <span className="recent-preview">{v.notes.slice(0, 50)}{v.notes.length > 50 ? '…' : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default ProfilePage;
