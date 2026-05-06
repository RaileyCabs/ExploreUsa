import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import VisitModal from './VisitModal';

const JournalPage = ({ visits, onDelete, onUpdateVisit }) => {
  const [expandedStates, setExpandedStates] = useState(() => new Set());
  const [editVisit, setEditVisit] = useState(null); // full visit object being edited
  const [visitPendingDelete, setVisitPendingDelete] = useState(null);

  const groupedVisits = useMemo(() => {
    const grouped = visits.reduce((acc, visit) => {
      const key = visit.stateCode || visit.stateName;
      if (!acc[key]) {
        acc[key] = {
          stateCode: visit.stateCode || '',
          stateName: visit.stateName,
          visits: []
        };
      }
      acc[key].visits.push(visit);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.stateName.localeCompare(b.stateName));
  }, [visits]);

  const colorways = [
    { shell: '#e9d39f', fill: '#d68062', accent: '#643421' },
    { shell: '#a8cbc3', fill: '#4f7f73', accent: '#1d3f3a' },
    { shell: '#d7be9d', fill: '#8a6b4a', accent: '#402716' },
    { shell: '#e4b4a0', fill: '#b4573d', accent: '#5c2416' },
    { shell: '#bfcad8', fill: '#5f6f91', accent: '#1e2940' },
    { shell: '#d8c58f', fill: '#936e1f', accent: '#45320d' }
  ];

  const toggleExpanded = (code) => {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const openEditModal = (visit) => {
    setEditVisit(visit);
  };

  const closeEditModal = () => setEditVisit(null);

  const openDeleteConfirm = (visit) => {
    setVisitPendingDelete(visit);
  };

  const closeDeleteConfirm = () => {
    setVisitPendingDelete(null);
  };

  const confirmDelete = () => {
    if (!visitPendingDelete) {
      return;
    }
    onDelete(visitPendingDelete.id);
    setVisitPendingDelete(null);
  };

  const saveEditModal = (updatedVisit) => {
    onUpdateVisit(updatedVisit);
    setEditVisit(null);
  };

  const renderStars = (rating) => {
    const rounded = Math.max(0, Math.min(5, Math.round(rating)));
    return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
  };

  const normalizeCompanionNames = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
    }
    return [];
  };

  return (
    <div className="journal-page">
      <div className="journal-header">
        <h2>Journal</h2>
        <Link to="/" className="back-to-map-btn">← Back to Map</Link>
      </div>

      {visits.length === 0 ? (
        <div className="empty-journal">
          <p>No visits yet.</p>
          <p>Go to the <Link to="/">Map</Link> and click any state to log your first trip!</p>
        </div>
      ) : (
        <div className="journal-grid">
          {groupedVisits.map((group, index) => {
            const averageRating = group.visits.reduce((sum, visit) => sum + visit.rating, 0) / group.visits.length;
            const isExpanded = expandedStates.has(group.stateCode);
            const colorway = colorways[index % colorways.length];

            return (
              <div
                key={group.stateCode || group.stateName}
                className={`magnet-card ${isExpanded ? 'expanded' : ''}`}
                style={{
                  '--magnet-shell': colorway.shell,
                  '--magnet-fill': colorway.fill,
                  '--magnet-accent': colorway.accent
                }}
              >
                <button
                  type="button"
                  className="magnet-toggle"
                  onClick={() => toggleExpanded(group.stateCode)}
                >
                  <div className="magnet-shape-wrap">
                    <img
                      src={`/flags/${group.stateCode.toLowerCase()}.svg`}
                      alt=""
                      className="magnet-flag-img"
                      loading="eager"
                      decoding="async"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="magnet-code-tag">{group.stateCode}</span>
                  </div>

                  <div className="magnet-state-name">{group.stateName}</div>
                  <div className="magnet-meta-row">
                    <span className="magnet-rating">{renderStars(averageRating)}</span>
                    <span className="magnet-trips">{group.visits.length} trip{group.visits.length === 1 ? '' : 's'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="magnet-entries">
                    {group.visits.map((visit) => (
                      <div key={visit.id} className="journal-entry">
                        <div className="entry-header">
                          <span className="entry-date">📅 {visit.date || 'Date not set'}</span>
                          <span className="entry-rating">{renderStars(visit.rating)}</span>
                          <button
                            type="button"
                            className="delete-entry"
                            onClick={() => openDeleteConfirm(visit)}
                            aria-label={`Delete visit for ${visit.stateName} on ${visit.date || 'saved date'}`}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="entry-title">{visit.title || 'Untitled Trip'}</div>

                        {(visit.companionTypes?.length > 0 || normalizeCompanionNames(visit.companionNames).length > 0) && (
                          <div className="entry-meta-row">
                            <span className="entry-meta-icon">👥</span>
                            <span>{[...(visit.companionTypes || []), ...normalizeCompanionNames(visit.companionNames)].join(', ')}</span>
                          </div>
                        )}

                        {visit.activityTags?.length > 0 && (
                          <div className="entry-meta-row">
                            <span className="entry-meta-icon">🎯</span>
                            <span>{visit.activityTags.join(' · ')}</span>
                          </div>
                        )}

                        {visit.expenses && Object.values(visit.expenses).some((v) => parseFloat(v) > 0) && (
                          <div className="entry-meta-row">
                            <span className="entry-meta-icon">💰</span>
                            <span>
                              ${(['gas','food','lodging','activities','transport']
                                .reduce((s, k) => s + (parseFloat(visit.expenses[k]) || 0), 0)).toFixed(2)} total
                            </span>
                          </div>
                        )}

                        {visit.recommend && (
                          <div className="entry-meta-row">
                            <span className="entry-meta-icon">👍</span>
                            <span>{{ yes: '✅ Would recommend', no: '❌ Wouldn\'t recommend', maybe: '🤷 Maybe recommend' }[visit.recommend]}</span>
                          </div>
                        )}

                        <div className="entry-notes">{visit.notes || 'No notes added.'}</div>
                        <button type="button" className="note-edit-btn" onClick={() => openEditModal(visit)}>Edit visit</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="journal-stats">
        <span>Total states: {groupedVisits.length}/50</span>
        <span>Total trips: {visits.length}</span>
      </div>

      {editVisit && (
        <VisitModal
          state={{ code: editVisit.stateCode, name: editVisit.stateName }}
          initialData={editVisit}
          onClose={closeEditModal}
          onSave={saveEditModal}
        />
      )}

      {visitPendingDelete && (
        <div className="modal-overlay" onClick={closeDeleteConfirm}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete this visit?</h3>
              <button type="button" className="close-btn" onClick={closeDeleteConfirm}>✕</button>
            </div>
            <p className="delete-confirm-copy">
              Remove <strong>{visitPendingDelete.title || 'this trip'}</strong> from {visitPendingDelete.stateName}?
            </p>
            <p className="delete-confirm-note">This action cannot be undone.</p>
            <div className="form-buttons delete-confirm-actions">
              <button type="button" className="cancel-btn" onClick={closeDeleteConfirm}>Keep visit</button>
              <button type="button" className="save-btn delete-confirm-btn" onClick={confirmDelete}>Delete visit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalPage;
