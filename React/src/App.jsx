import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import TestPage from './pages/TestPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'

// W52 Layout + Tabs
import W52Layout from './pages/boards/W52/W52Layout'
import WardTab from './pages/boards/W52/tabs/WardTab'
import CareTab from './pages/boards/W52/tabs/CareTab'
import SurgeryTab from './pages/boards/W52/tabs/SurgeryTab'
import ExamTab from './pages/boards/W52/tabs/ExamTab'
import ContactTab from './pages/boards/W52/tabs/ContactTab'
import ScheduleTab from './pages/boards/W52/tabs/ScheduleTab'
import DoctorTab from './pages/boards/W52/tabs/DoctorTab'
import BulletinTab from './pages/boards/W52/tabs/BulletinTab'
import EvacuationTab from './pages/boards/W52/tabs/EvacuationTab'
import HandoverTab from './pages/boards/W52/tabs/HandoverTab'
import TeamTab from './pages/boards/W52/tabs/TeamTab'

// 其他板（保持原有單頁）
import IcuPage from './pages/boards/ICU/IcuPage'
import OrPage from './pages/boards/OR/OrPage'
import ErPage from './pages/boards/ER/ErPage'

function ProtectedRoute({ children }) {
  const { role } = useAuth()
  return role ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

      {/* W52 巢狀路由 */}
      <Route path="/w52" element={<W52Layout />}>
        <Route index element={<Navigate to="ward" replace />} />
        <Route path="ward"       element={<WardTab />} />
        <Route path="care"       element={<CareTab />} />
        <Route path="surgery"    element={<SurgeryTab />} />
        <Route path="exam"       element={<ExamTab />} />
        <Route path="contact"    element={<ContactTab />} />
        <Route path="schedule"   element={<ScheduleTab />} />
        <Route path="doctor"     element={<DoctorTab />} />
        <Route path="bulletin"   element={<BulletinTab />} />
        <Route path="evacuation" element={<EvacuationTab />} />
        <Route path="handover"   element={<HandoverTab />} />
        <Route path="team"       element={<TeamTab />} />
      </Route>

      <Route path="/icu" element={<IcuPage />} />
      <Route path="/or" element={<OrPage />} />
      <Route path="/er" element={<ErPage />} />
    </Routes>
  )
}

export default App
