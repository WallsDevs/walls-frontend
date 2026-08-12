import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import Developers from './pages/admin/Developers'
import DeveloperDetail from './pages/admin/DeveloperDetail'
import Projects from './pages/admin/Projects'
import ProjectDetail from './pages/admin/ProjectDetail'
import Tasks from './pages/admin/Tasks'
import Billing from './pages/admin/Billing'
import InvoicePage from './pages/admin/InvoicePage'
import Clients from './pages/admin/Clients'
import Staff from './pages/admin/Staff'
import MyTasks from './pages/dev/MyTasks'
import MyHours from './pages/dev/MyHours'
import ClientProjects from './pages/client/ClientProjects'
import ClientProjectReport from './pages/client/ClientProjectReport'
import ClientInvoices from './pages/client/ClientInvoices'

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="developers" element={<Developers />} />
      <Route path="developers/:documentId" element={<DeveloperDetail />} />
      <Route path="projects" element={<Projects />} />
      <Route path="projects/:documentId" element={<ProjectDetail />} />
      <Route path="tasks" element={<Tasks />} />
      <Route path="billing" element={<Billing />} />
      <Route path="billing/invoices/:documentId" element={<InvoicePage />} />
      <Route path="clients" element={<Clients />} />
      <Route path="staff" element={<Staff />} />
      <Route path="my-tasks" element={<MyTasks />} />
      <Route path="my-hours" element={<MyHours />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function DevRoutes() {
  return (
    <Routes>
      <Route index element={<MyTasks />} />
      <Route path="my-hours" element={<MyHours />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ClientRoutes() {
  return (
    <Routes>
      <Route index element={<ClientProjects />} />
      <Route path="client-projects/:documentId" element={<ClientProjectReport />} />
      <Route path="invoices" element={<ClientInvoices />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Shell() {
  const { auth } = useAuth()
  if (!auth) return <Navigate to="/login" replace />

  const role = auth.me.role
  return (
    <Layout>
      {role === 'admin' ? (
        <AdminRoutes />
      ) : role === 'developer' ? (
        <DevRoutes />
      ) : role === 'client' ? (
        <ClientRoutes />
      ) : (
        <p className="text-sm text-slate-500">Tu cuenta no tiene un rol asignado. Contacta al administrador.</p>
      )}
    </Layout>
  )
}

export default function App() {
  const { auth } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<Shell />} />
    </Routes>
  )
}
