import React from 'react';

const StatsBar = ({ visitedCount, averageRating, totalTrips }) => {
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <span className="stat-value">{visitedCount}/50</span>
        <span className="stat-label">states visited</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{averageRating}</span>
        <span className="stat-label">avg rating</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{totalTrips}</span>
        <span className="stat-label">total trips</span>
      </div>
    </div>
  );
};

export default StatsBar;
