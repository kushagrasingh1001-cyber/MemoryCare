import {Navigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {useGroup,membershipFor} from '../hooks/useGroup';
import {homeRouteForRole} from '../services/authService';
import {LoadingScreen,ProfileRecovery,RemovedFromSpace,GroupProblem} from '../components/AccountRecovery';

/**
 * Guards a route by role *and* by care-space membership.
 *
 * Loading is always respected first: the app never redirects while the profile
 * document is still being read, which is what used to send caregivers to the
 * patient screens straight after login.
 */
export default function ProtectedRoute({role,children}){
  const {user,profile,loading,profileLoading,profileError}=useAuth();
  const groupId=profile?.groupId||null;
  const {group,groupLoading,status}=useGroup(groupId);

  if(loading||profileLoading)return <LoadingScreen/>;
  if(!user)return <Navigate to="/login" replace/>;
  if(!profile)return <ProfileRecovery errorCode={profileError}/>;
  if(role&&profile.role!==role)return <Navigate to={homeRouteForRole(profile.role)} replace/>;

  if(groupId&&groupLoading)return <LoadingScreen/>;
  if(groupId&&(status==='denied'||(status==='ready'&&membershipFor(profile,group)==='not-member'))){
    return profile.role==='caregiver'?<RemovedFromSpace/>:<GroupProblem/>;
  }

  return children;
}
