import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="main-nav">
      <div className="logo">TimeJump</div>
      <div className="nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/attractions">Attractions</NavLink>
        <NavLink to="/tickets">Tickets</NavLink>
        <NavLink to="/parking">Parking</NavLink>
        <NavLink to="/login">Employee</NavLink>
      </div>
    </nav>
  );
}
