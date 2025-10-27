import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import HeroBanner from './components/HeroBanner.jsx';
import Home from './pages/Home.jsx';
import Attractions from './pages/Attractions.jsx';
import Tickets from './pages/Tickets.jsx';
import Parking from './pages/Parking.jsx';
import Login from './pages/Login.jsx';
import AttractionDetails from './pages/AttractionDetails.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={
          <>
            <HeroBanner />
            <Home />
          </>
        } />
        <Route path="/attractions" element={<Attractions />} />
        <Route path="/attractions/:id" element={<AttractionDetails />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/parking" element={<Parking />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}
