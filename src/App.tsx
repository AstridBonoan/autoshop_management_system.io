import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { UserProfilePage } from './pages/UserProfilePage'
import { ClientsPage } from './pages/ClientsPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { VehiclesPage } from './pages/VehiclesPage'
import { VehicleDetailPage } from './pages/VehicleDetailPage'
import { TasksPage } from './pages/TasksPage'
import { RepairOrdersPage } from './pages/RepairOrdersPage'
import { RepairOrderDetailPage } from './pages/RepairOrderDetailPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { EstimatesPage } from './pages/EstimatesPage'
import { InspectionsPage } from './pages/InspectionsPage'
import { TechniciansPage } from './pages/TechniciansPage'
import { SchedulePage } from './pages/SchedulePage'
import { PartsPage } from './pages/PartsPage'
import { InventoryPage } from './pages/InventoryPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ActivityPage } from './pages/ActivityPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProtectedRoute module="dashboard"><DashboardPage /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute module="users"><UsersPage /></ProtectedRoute>} />
            <Route path="users/:id" element={<ProtectedRoute module="users"><UserProfilePage /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
            <Route path="customers" element={<ProtectedRoute module="clients"><ClientsPage /></ProtectedRoute>} />
            <Route path="customers/:id" element={<ProtectedRoute module="clients"><ClientDetailPage /></ProtectedRoute>} />
            <Route path="clients" element={<Navigate to="/customers" replace />} />
            <Route path="clients/:id" element={<ProtectedRoute module="clients"><ClientDetailPage /></ProtectedRoute>} />
            <Route path="vehicles" element={<ProtectedRoute module="vehicles"><VehiclesPage /></ProtectedRoute>} />
            <Route path="vehicles/:id" element={<ProtectedRoute module="vehicles"><VehicleDetailPage /></ProtectedRoute>} />
            <Route path="tasks" element={<ProtectedRoute module="tasks"><TasksPage /></ProtectedRoute>} />
            <Route path="repair-orders" element={<ProtectedRoute module="repair_orders"><RepairOrdersPage /></ProtectedRoute>} />
            <Route path="repair-orders/:id" element={<ProtectedRoute module="repair_orders"><RepairOrderDetailPage /></ProtectedRoute>} />
            <Route path="projects" element={<Navigate to="/repair-orders" replace />} />
            <Route path="projects/:id" element={<Navigate to="/repair-orders" replace />} />
            <Route path="appointments" element={<ProtectedRoute module="appointments"><AppointmentsPage /></ProtectedRoute>} />
            <Route path="estimates" element={<ProtectedRoute module="estimates"><EstimatesPage /></ProtectedRoute>} />
            <Route path="inspections" element={<ProtectedRoute module="inspections"><InspectionsPage /></ProtectedRoute>} />
            <Route path="technicians" element={<ProtectedRoute module="technicians"><TechniciansPage /></ProtectedRoute>} />
            <Route path="schedule" element={<ProtectedRoute module="scheduling"><SchedulePage /></ProtectedRoute>} />
            <Route path="parts" element={<ProtectedRoute module="parts"><PartsPage /></ProtectedRoute>} />
            <Route path="inventory" element={<ProtectedRoute module="inventory"><InventoryPage /></ProtectedRoute>} />
            <Route path="payments" element={<ProtectedRoute module="payments"><PaymentsPage /></ProtectedRoute>} />
            <Route path="documents" element={<ProtectedRoute module="documents"><DocumentsPage /></ProtectedRoute>} />
            <Route path="activity" element={<ProtectedRoute module="activity"><ActivityPage /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute module="notifications"><NotificationsPage /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute module="settings"><SettingsPage /></ProtectedRoute>} />
            <Route path="settings/roles" element={<ProtectedRoute module="roles"><SettingsPage /></ProtectedRoute>} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
