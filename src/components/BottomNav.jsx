import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
  return (
    <div className="bottom-nav">
      <div className="nav-container">
        <NavLink
          to="/"
          end
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          <span className="nav-icon">🗺️</span>
        </NavLink>

        <NavLink
          to="/journal"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          <span className="nav-icon">📔</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          <span className="nav-icon">👤</span>
        </NavLink>
      </div>
    </div>
  );
};

export default BottomNav;
