import React, { useState } from 'react';

const COMPANION_OPTIONS = ['Solo', 'Partner', 'Family', 'Friends', 'Group'];

const ACTIVITY_OPTIONS = [
  'Hiking', 'City Tour', 'Food Tour', 'Beach', 'Museum', 'Concert',
  'Skiing', 'Fishing', 'Golf', 'Road Trip', 'Shopping', 'Camping',
];

const emptyExpenses = { gas: '', food: '', lodging: '', activities: '', transport: '' };

const normalizeCompanionNames = (value) => {
  if (Array.isArray(value)) {
    return value.map((n) => n.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
  }
  return [];
};

const calcTotal = (exp) =>
  ['gas', 'food', 'lodging', 'activities', 'transport']
    .reduce((sum, k) => sum + (parseFloat(exp[k]) || 0), 0);

const VisitModal = ({ state, onClose, onSave, initialData, saveError }) => {
  const [formData, setFormData] = useState(() => initialData ? {
    title: initialData.title || '',
    date: initialData.date || '',
    companionTypes: initialData.companionTypes || [],
    companionNames: normalizeCompanionNames(initialData.companionNames),
    expenses: { ...emptyExpenses, ...(initialData.expenses || {}) },
    activityTags: initialData.activityTags || [],
    notes: initialData.notes || '',
    rating: initialData.rating ?? 5,
    recommend: initialData.recommend || null,
  } : {
    title: '',
    date: '',
    companionTypes: [],
    companionNames: [],
    expenses: { ...emptyExpenses },
    activityTags: [],
    notes: '',
    rating: 5,
    recommend: null,
  });
  const [companionInput, setCompanionInput] = useState('');
  const [activityInput, setActivityInput] = useState('');
  const [splitBy, setSplitBy] = useState(initialData?.splitBy || 1);
  const [formError, setFormError] = useState('');

  if (!state) return null;

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const toggleCompanion = (opt) => {
    set('companionTypes',
      formData.companionTypes.includes(opt)
        ? formData.companionTypes.filter((c) => c !== opt)
        : [...formData.companionTypes, opt]
    );
  };

  const commitCompanionInput = () => {
    const trimmed = companionInput.trim();
    if (trimmed && !formData.companionNames.includes(trimmed)) {
      set('companionNames', [...formData.companionNames, trimmed]);
    }
    setCompanionInput('');
  };

  const handleCompanionKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitCompanionInput();
    }
  };

  const removeCompanionName = (name) => {
    set('companionNames', formData.companionNames.filter((n) => n !== name));
  };

  const toggleActivity = (val) => {
    set('activityTags',
      formData.activityTags.includes(val)
        ? formData.activityTags.filter((a) => a !== val)
        : [...formData.activityTags, val]
    );
  };

  const commitActivityInput = () => {
    const trimmed = activityInput.trim();
    if (trimmed && !formData.activityTags.includes(trimmed)) {
      set('activityTags', [...formData.activityTags, trimmed]);
    }
    setActivityInput('');
  };

  const handleActivityKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitActivityInput();
    }
  };

  const setExpense = (key, value) =>
    set('expenses', { ...formData.expenses, [key]: value });

  const total = calcTotal(formData.expenses);

  const handleSubmit = (e) => {
    e.preventDefault();
    const pendingCompanion = companionInput.trim();
    const companionNames = pendingCompanion && !formData.companionNames.includes(pendingCompanion)
      ? [...formData.companionNames, pendingCompanion]
      : formData.companionNames;
    const pending = activityInput.trim();
    const tags = pending && !formData.activityTags.includes(pending)
      ? [...formData.activityTags, pending]
      : formData.activityTags;

    const hasCompanions = formData.companionTypes.length > 0 || companionNames.length > 0;

    if (
      !formData.title.trim() ||
      !formData.date ||
      !hasCompanions ||
      !formData.notes.trim() ||
      !formData.recommend
    ) {
      setFormError('Please complete every section before saving your trip.');
      return;
    }

    setFormError('');
    const saved = {
      ...formData,
      companionNames,
      activityTags: tags,
      splitBy,
      stateCode: state.code,
      stateName: state.name,
    };
    if (initialData?.id) saved.id = initialData.id;
    onSave(saved);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initialData ? 'Edit visit' : 'Log your visit'} — {state.name}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="visit-form">

          {/* Trip title */}
          <div className="vf-section">
            <label className="vf-label">Trip title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Summer Road Trip"
              required
            />
          </div>

          {/* Date */}
          <div className="vf-section">
            <label className="vf-label">Date visited</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>

          {/* Companions */}
          <div className="vf-section">
            <label className="vf-label">Who did you go with?</label>
            <div className="chip-row">
              {COMPANION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`chip ${formData.companionTypes.includes(opt) ? 'chip--active' : ''}`}
                  onClick={() => toggleCompanion(opt)}
                >{opt}</button>
              ))}
              {formData.companionNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="chip chip--active chip--custom"
                  onClick={() => removeCompanionName(name)}
                >{name} ✕</button>
              ))}
            </div>
            <input
              type="text"
              className="vf-sub-input"
              placeholder="Add companion name — press Enter or comma"
              value={companionInput}
              onChange={(e) => setCompanionInput(e.target.value)}
              onKeyDown={handleCompanionKeyDown}
              onBlur={commitCompanionInput}
            />
          </div>

          {/* Expenses */}
          <div className="vf-section">
            <label className="vf-label">Expenses</label>
            <div className="expense-grid">
              {[
                ['gas', 'Gas'],
                ['food', 'Food'],
                ['lodging', 'Lodging'],
                ['activities', 'Activities'],
                ['transport', 'Transport'],
              ].map(([key, label]) => (
                <div key={key} className="expense-row">
                  <span className="expense-label">{label}</span>
                  <span className="expense-dollar">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="expense-input"
                    placeholder="0"
                    value={formData.expenses[key]}
                    onChange={(e) => setExpense(key, e.target.value)}
                  />
                </div>
              ))}
              <div className="expense-total-row">
                <span>Total</span>
                <span className="expense-total-val">${total.toFixed(2)}</span>
              </div>
              <div className="expense-split-row">
                <span className="expense-split-label">Split by</span>
                <div className="split-stepper">
                  <button type="button" className="split-step-btn" onClick={() => setSplitBy((n) => Math.max(1, n - 1))}>−</button>
                  <span className="split-count">{splitBy} {splitBy === 1 ? 'person' : 'people'}</span>
                  <button type="button" className="split-step-btn" onClick={() => setSplitBy((n) => n + 1)}>+</button>
                </div>
                <span className="expense-split-val">${(total / splitBy).toFixed(2)} each</span>
              </div>
            </div>
          </div>

          {/* Activities */}
          <div className="vf-section">
            <label className="vf-label">Activities</label>
            <div className="chip-row chip-row--wrap">
              {ACTIVITY_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${formData.activityTags.includes(value) ? 'chip--active' : ''}`}
                  onClick={() => toggleActivity(value)}
                >{value}</button>
              ))}
              {/* custom tags added by user */}
              {formData.activityTags
                .filter((t) => !ACTIVITY_OPTIONS.includes(t))
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="chip chip--active chip--custom"
                    onClick={() => toggleActivity(t)}
                  >{t} ✕</button>
                ))}
            </div>
            <input
              type="text"
              className="vf-sub-input"
              placeholder="Add activity — press Enter or comma"
              value={activityInput}
              onChange={(e) => setActivityInput(e.target.value)}
              onKeyDown={handleActivityKeyDown}
              onBlur={commitActivityInput}
            />
          </div>

          {/* Notes */}
          <div className="vf-section">
            <label className="vf-label">What did you do?</label>
            <textarea
              rows="3"
              placeholder="Hiked the Grand Canyon, ate deep dish pizza..."
              value={formData.notes}
              onChange={(e) => set('notes', e.target.value)}
              required
            />
          </div>

          {formError && <p className="vf-form-error">{formError}</p>}

          {/* Rating */}
          <div className="vf-section">
            <label className="vf-label">⭐ Rating</label>
            <div className="star-row">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`star-pick ${formData.rating >= r ? 'star-pick--on' : ''}`}
                  onClick={() => set('rating', r)}
                >★</button>
              ))}
            </div>
          </div>

          {/* Recommend */}
          <div className="vf-section">
            <label className="vf-label">Would you recommend?</label>
            <div className="chip-row">
              {[['yes', 'Yes'], ['no', 'No'], ['maybe', 'Maybe']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`chip ${formData.recommend === val ? 'chip--active' : ''}`}
                  onClick={() => set('recommend', formData.recommend === val ? null : val)}
                >{label}</button>
              ))}
            </div>
          </div>

          {saveError && <p className="vf-form-error" style={{marginBottom: '8px'}}>{saveError}</p>}
          <div className="form-buttons">
            <button type="submit" className="save-btn">{initialData ? 'Save Changes' : 'Save Trip'}</button>
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitModal;
