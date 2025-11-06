import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../context/authcontext.jsx';
import { AdminShell } from './layout.jsx';
import TicketsPage from './catalog/tickets.jsx';
import ParkingPage from './catalog/parking.jsx';
import GiftPage from './catalog/gift.jsx';
import FoodPage from './catalog/food.jsx';
import ThemesPage from './catalog/themes.jsx';
import AttractionsPage from './catalog/attractions.jsx';
import EmployeesPage from './operations/employees.jsx';
import MaintenancePage from './operations/maintenance.jsx';
import IncidentPage from './operations/incidents.jsx';
import TeamPage from './team.jsx';

export default function Admin() {
  const { user, actualRole } = useAuth();
  const allowedRole = actualRole ?? user?.role;
  const canManageAdmins = allowedRole === 'owner';
  const canManageManagers = ['admin', 'owner'].includes(allowedRole || '');
  const canManageEmployees = ['admin', 'owner'].includes(allowedRole || '');

  return (
    <AdminShell>
      <Routes>
        <Route index element={<Navigate to="tickets" replace />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="parking" element={<ParkingPage />} />
        <Route path="gift" element={<GiftPage />} />
        <Route path="food" element={<FoodPage />} />
        <Route path="themes" element={<ThemesPage />} />
        <Route path="attractions" element={<AttractionsPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="incidents" element={<IncidentPage />} />
        <Route
          path="team"
          element={
            <TeamPage
              canManageAdmins={canManageAdmins}
              canManageManagers={canManageManagers}
              canManageEmployees={canManageEmployees}
            />
          }
        />
        <Route path="*" element={<Navigate to="tickets" replace />} />
      </Routes>
    </AdminShell>
  );
}
