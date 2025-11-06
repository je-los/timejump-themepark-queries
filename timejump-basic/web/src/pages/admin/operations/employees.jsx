import React from 'react';
import { SimpleTable } from '../shared.jsx';

export default function EmployeesPage() {
  return (
    <SimpleTable
      title="Employees"
      path="/employees"
      columns={['name', 'role_name', 'start_date', 'end_date', 'email']}
      emptyMessage="No employees found."
      searchPlaceholder="Search employees..."
      sortableKeys={['name', 'role_name', 'start_date']}
    />
  );
}
