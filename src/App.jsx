import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {useAuth} from './context/AuthContext';
import {homeRouteForRole} from './services/authService';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import {LoadingScreen,ProfileRecovery} from './components/AccountRecovery';
import Login from './pages/auth/Login';
import PatientSignup from './pages/auth/PatientSignup';
import CaregiverSignup from './pages/auth/CaregiverSignup';
import Join from './pages/auth/Join';
import PatientHome from './pages/patient/PatientHome';
import GamesPage from './pages/patient/GamesPage';
import PatientReminders from './pages/patient/PatientReminders';
import FamilyPage from './pages/patient/FamilyPage';
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';
import CreateReminder from './pages/caregiver/CreateReminder';
import History from './pages/caregiver/History';
import OfflineIndicator from './components/OfflineIndicator';
import PagerManagement from './pages/caregiver/PagerManagement';
import MemoryGallery from './pages/MemoryGallery';

function Root(){
  const {user,profile,loading,profileLoading}=useAuth();
  if(loading||(user&&profileLoading))return <LoadingScreen/>;
  if(!user)return <Navigate to="/login" replace/>;
  // Signed in but no profile document: show the recovery screen instead of guessing a role.
  if(!profile)return <ProfileRecoveryRoute/>;
  return <Navigate to={homeRouteForRole(profile.role)} replace/>;
}

function ProfileRecoveryRoute(){
  const {profileError}=useAuth();
  return <ProfileRecovery errorCode={profileError}/>;
}

export default function App(){
  return <BrowserRouter>
    <OfflineIndicator/>
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Root/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/signup/patient" element={<PatientSignup/>}/>
        <Route path="/signup/caregiver" element={<CaregiverSignup/>}/>
        <Route path="/join" element={<Join/>}/>
        <Route path="/account-help" element={<Root/>}/>
        <Route path="/patient/home" element={<ProtectedRoute role="patient"><PatientHome/></ProtectedRoute>}/>
        <Route path="/patient/games" element={<ProtectedRoute role="patient"><GamesPage/></ProtectedRoute>}/>
        <Route path="/patient/games/:gameType" element={<ProtectedRoute role="patient"><GamesPage/></ProtectedRoute>}/>
        <Route path="/patient/reminders" element={<ProtectedRoute role="patient"><PatientReminders/></ProtectedRoute>}/>
        <Route path="/memory-gallery" element={<ProtectedRoute><MemoryGallery/></ProtectedRoute>}/>
        <Route path="/patient/family" element={<ProtectedRoute role="patient"><FamilyPage/></ProtectedRoute>}/>
        <Route path="/caregiver/dashboard" element={<ProtectedRoute role="caregiver"><CaregiverDashboard/></ProtectedRoute>}/>
        <Route path="/caregiver/reminders" element={<ProtectedRoute role="caregiver"><CreateReminder/></ProtectedRoute>}/>
        <Route path="/caregiver/history" element={<ProtectedRoute role="caregiver"><History/></ProtectedRoute>}/>
        <Route path="/caregiver/pager" element={<ProtectedRoute role="caregiver"><PagerManagement/></ProtectedRoute>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </ErrorBoundary>
  </BrowserRouter>;
}
