import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import TestPage from './pages/TestPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'

// W52 Layout + Tabs
import W52Layout from './pages/boards/W52/W52Layout'
import W52WardTab from './pages/boards/W52/tabs/WardTab'
import CareTab from './pages/boards/W52/tabs/CareTab'
import W52SurgeryTab from './pages/boards/W52/tabs/SurgeryTab'
import W52ExamTab from './pages/boards/W52/tabs/ExamTab'
import W52ContactTab from './pages/boards/W52/tabs/ContactTab'
import W52ScheduleTab from './pages/boards/W52/tabs/ScheduleTab'
import DoctorTab from './pages/boards/W52/tabs/DoctorTab'
import W52BulletinTab from './pages/boards/W52/tabs/BulletinTab'
import W52EvacuationTab from './pages/boards/W52/tabs/EvacuationTab'
import HandoverTab from './pages/boards/W52/tabs/HandoverTab'
import TeamTab from './pages/boards/W52/tabs/TeamTab'

// ICU Layout + Tabs
import IcuLayout from './pages/boards/ICU/IcuLayout'
import IcuWardTab from './pages/boards/ICU/tabs/WardTab'
import AntibioticTab from './pages/boards/ICU/tabs/AntibioticTab'
import TubeTab from './pages/boards/ICU/tabs/TubeTab'
import IcuSurgeryTab from './pages/boards/ICU/tabs/SurgeryTab'
import IcuExamTab from './pages/boards/ICU/tabs/ExamTab'
import IcuContactTab from './pages/boards/ICU/tabs/ContactTab'

import IcuBulletinTab from './pages/boards/ICU/tabs/BulletinTab'
import IcuEvacuationTab from './pages/boards/ICU/tabs/EvacuationTab'

// OR Layout + Tabs
import OrLayout from './pages/boards/OR/OrLayout'
import OrWardTab from './pages/boards/OR/tabs/WardTab'
import OrScheduleTab from './pages/boards/OR/tabs/ScheduleTab'
import OrHandoverTab from './pages/boards/OR/tabs/HandoverTab'
import OrContactTab from './pages/boards/OR/tabs/ContactTab'
import OrBulletinTab from './pages/boards/OR/tabs/BulletinTab'
import OrEvacuationTab from './pages/boards/OR/tabs/EvacuationTab'

// ER Layout + Tabs
import ErLayout from './pages/boards/ER/ErLayout'
import ErWardTab from './pages/boards/ER/tabs/WardTab'
import ErExamTab from './pages/boards/ER/tabs/ExamTab'
import MassCasualtyTab from './pages/boards/ER/tabs/MassCasualtyTab'
import ErContactTab from './pages/boards/ER/tabs/ContactTab'
import ErBulletinTab from './pages/boards/ER/tabs/BulletinTab'
import ErEvacuationTab from './pages/boards/ER/tabs/EvacuationTab'

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
        <Route path="ward"       element={<W52WardTab />} />
        <Route path="care"       element={<CareTab />} />
        <Route path="surgery"    element={<W52SurgeryTab />} />
        <Route path="exam"       element={<W52ExamTab />} />
        <Route path="contact"    element={<W52ContactTab />} />
        <Route path="schedule"   element={<W52ScheduleTab />} />
        <Route path="doctor"     element={<DoctorTab />} />
        <Route path="bulletin"   element={<W52BulletinTab />} />
        <Route path="evacuation" element={<W52EvacuationTab />} />
        <Route path="handover"   element={<HandoverTab />} />
        <Route path="team"       element={<TeamTab />} />
      </Route>

      {/* ICU 巢狀路由 */}
      <Route path="/icu" element={<IcuLayout />}>
        <Route index element={<Navigate to="ward" replace />} />
        <Route path="ward"       element={<IcuWardTab />} />
        <Route path="antibiotic" element={<AntibioticTab />} />
        <Route path="tube"       element={<TubeTab />} />
        <Route path="surgery"    element={<IcuSurgeryTab />} />
        <Route path="exam"       element={<IcuExamTab />} />
        <Route path="contact"    element={<IcuContactTab />} />

        <Route path="bulletin"   element={<IcuBulletinTab />} />
        <Route path="evacuation" element={<IcuEvacuationTab />} />
      </Route>

      {/* OR 巢狀路由 */}
      <Route path="/or" element={<OrLayout />}>
        <Route index element={<Navigate to="ward" replace />} />
        <Route path="ward"       element={<OrWardTab />} />
        <Route path="schedule"   element={<OrScheduleTab />} />
        <Route path="handover"   element={<OrHandoverTab />} />
        <Route path="contact"    element={<OrContactTab />} />
        <Route path="bulletin"   element={<OrBulletinTab />} />
        <Route path="evacuation" element={<OrEvacuationTab />} />
      </Route>

      {/* ER 巢狀路由 */}
      <Route path="/er" element={<ErLayout />}>
        <Route index element={<Navigate to="ward" replace />} />
        <Route path="ward"          element={<ErWardTab />} />
        <Route path="exam"          element={<ErExamTab />} />
        <Route path="mass-casualty" element={<MassCasualtyTab />} />
        <Route path="contact"       element={<ErContactTab />} />
        <Route path="bulletin"      element={<ErBulletinTab />} />
        <Route path="evacuation"    element={<ErEvacuationTab />} />
      </Route>
    </Routes>
  )
}

export default App
