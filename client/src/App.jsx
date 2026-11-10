import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { PageSkeleton } from './components/ui';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

import PatientDashboard from './pages/patient/Dashboard';
import PatientRecords from './pages/patient/Records';
import HealthProfile from './pages/patient/HealthProfile';
import EmergencyProfile from './pages/patient/EmergencyProfile';
import Appointments from './pages/patient/Appointments';
import AccessControl from './pages/patient/AccessControl';

import DoctorDashboard from './pages/doctor/Dashboard';
import PatientSearch from './pages/doctor/PatientSearch';
import PatientHistory from './pages/doctor/PatientHistory';
import Prescriptions from './pages/doctor/Prescriptions';
import DoctorAppointments from './pages/doctor/Appointments';
import EmergencyAccess from './pages/doctor/EmergencyAccess';
import EmergencyDashboard from './pages/doctor/EmergencyDashboard';

import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import EmergencyReview from './pages/admin/EmergencyReview';

// Recharts is heavy: load the admin dashboard on demand.
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

export default function App() {
  return (
    <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dedicated emergency mode: no sidebar, high-contrast layout */}
        <Route element={<ProtectedRoute roles={['doctor']} />}>
          <Route path="/emergency/:sessionId" element={<EmergencyDashboard />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['patient']} />}>
          <Route element={<AppShell />}>
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="/patient/records" element={<PatientRecords />} />
            <Route path="/patient/health" element={<HealthProfile />} />
            <Route path="/patient/emergency" element={<EmergencyProfile />} />
            <Route path="/patient/appointments" element={<Appointments />} />
            <Route path="/patient/access" element={<AccessControl />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['doctor']} />}>
          <Route element={<AppShell />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/search" element={<PatientSearch />} />
            <Route path="/doctor/patients/:patientId" element={<PatientHistory />} />
            <Route path="/doctor/prescriptions" element={<Prescriptions />} />
            <Route path="/doctor/appointments" element={<DoctorAppointments />} />
            <Route path="/doctor/emergency" element={<EmergencyAccess />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
            <Route path="/admin/emergency" element={<EmergencyReview />} />
          </Route>
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
