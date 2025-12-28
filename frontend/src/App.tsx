import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavePage } from './pages/LeavePage';
import { LeaveConfigPage } from './pages/LeaveConfigPage';
import { PayrollPage } from './pages/PayrollPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { VisitsPage } from './pages/VisitsPage';
import { RoutePlansPage } from './pages/RoutePlansPage';
import { TasksPage } from './pages/TasksPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="leave/config" element={<LeaveConfigPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="route-plans" element={<RoutePlansPage />} />
          <Route path="tasks" element={<TasksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

