import {useEffect,useState} from 'react';
import {collection,doc,limit,onSnapshot,orderBy,query,where} from 'firebase/firestore';
import {Link,useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {db} from '../../firebase/firebase';
import {useAuth} from '../../context/AuthContext';
import {leaveGroup} from '../../services/authService';
import PatientStatusCard from '../../components/caregiver/PatientStatusCard';
import PerformanceChart from '../../components/caregiver/PerformanceChart';
import PerformanceInsights from '../../components/caregiver/PerformanceInsights';
import ReminderLog from '../../components/caregiver/ReminderLog';
import AlertHistory from '../../components/caregiver/AlertHistory';
import Button from '../../components/ui/Button';
import LogoutButton from '../../components/LogoutButton';
import LanguageToggle from '../../components/LanguageToggle';
import {Sparkles,ImagePlus,Pill,Phone,MessageCircle,MonitorSmartphone,LogOut} from 'lucide-react';

export default function CaregiverDashboard(){
  const {profile,refreshProfile}=useAuth();
  const {t}=useTranslation();
  const navigate=useNavigate();
  const [group,setGroup]=useState(null);
  const [patient,setPatient]=useState(null);
  const [sessions,setSessions]=useState([]);
  const [reminders,setReminders]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [leaveBusy,setLeaveBusy]=useState(false);

  useEffect(()=>{
    if(!profile?.groupId)return;
    return onSnapshot(doc(db,'groups',profile.groupId),g=>setGroup(g.exists()?{id:g.id,...g.data()}:null));
  },[profile?.groupId]);

  useEffect(()=>{
    if(!group?.patientUid)return;
    const u1=onSnapshot(doc(db,'users',group.patientUid),s=>setPatient(s.exists()?s.data():null));
    const u2=onSnapshot(query(collection(db,'users',group.patientUid,'gameSessions'),orderBy('completedAt','desc'),limit(30)),s=>setSessions(s.docs.map(d=>({id:d.id,...d.data()}))),()=>setSessions([]));
    const u3=onSnapshot(query(collection(db,'reminders'),where('patientId','==',group.patientUid)),s=>setReminders(s.docs.map(d=>({id:d.id,...d.data()}))),()=>setReminders([]));
    const u4=onSnapshot(query(collection(db,'groups',profile.groupId,'alerts'),orderBy('createdAt','desc'),limit(30)),s=>setAlerts(s.docs.map(d=>({id:d.id,...d.data()}))),()=>setAlerts([]));
    return ()=>[u1,u2,u3,u4].forEach(f=>f());
  },[group?.patientUid,profile?.groupId]);

  async function leave(){
    setLeaveBusy(true);
    try{
      await leaveGroup({groupId:profile.groupId,uid:profile.uid});
      await refreshProfile();
      navigate('/caregiver/dashboard',{replace:true});
    }finally{
      setLeaveBusy(false);
    }
  }

  return <main className="page premium-page">
    <div className="ambient ambient-one"/>
    <div className="max-w-6xl mx-auto relative z-10">
      <header className="top-shell">
        <div className="brand-mark"><span className="brand-icon"><Sparkles size={23}/></span><span>{t('app')}</span></div>
        <div className="header-actions"><LanguageToggle/><LogoutButton compact/></div>
      </header>

      <div className="welcome-block compact-welcome">
        <span className="eyebrow">{t('caregiverSpace')}</span>
        <h1>{t('careForTitle',{name:patient?.name||t('patientLabel')})}</h1>
        <p>{t('dashboardSub')}</p>
      </div>

      <section className="action-ribbon">
        <Link to="/caregiver/reminders" className="quick-action"><span><Pill/></span><b>{t('addMedicineSchedule')}</b></Link>
        <Link to="/memory-gallery" className="quick-action"><span><ImagePlus/></span><b>{t('addMemoryPhotos')}</b></Link>
        <button className="quick-action" onClick={()=>patient?.phone&&(location.href=`tel:${patient.phone}`)} disabled={!patient?.phone}><span><Phone/></span><b>{t('callPatient')}</b></button>
        <button className="quick-action" onClick={()=>patient?.phone&&(location.href=`sms:${patient.phone}?body=Just checking in. How are you?`)} disabled={!patient?.phone}><span><MessageCircle/></span><b>{t('sendCheckIn')}</b></button>
      </section>

      <section className="mt-6">
        <Link to="/caregiver/pager" className="pager-dashboard-card">
          <span className="pager-dashboard-icon"><MonitorSmartphone/></span>
          <span><b>{t('pagerManagement')}</b><small>{t('pagerManagementSub')}</small></span>
          <strong>{t('openPager')} →</strong>
        </Link>
      </section>

      <div className="grid lg:grid-cols-2 gap-5 mt-6 dashboard-grid">
        <PatientStatusCard patient={patient}/>
        <PerformanceChart sessions={sessions}/>
        <PerformanceInsights sessions={sessions}/>
        <ReminderLog items={reminders}/>
        <div className="dashboard-alerts-full"><AlertHistory groupId={profile?.groupId} alerts={alerts}/></div>
      </div>

      <section className="leave-space-block flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black">{t('leaveSpace')}</h2>
          <p className="opacity-75">{t('leaveBody')}</p>
        </div>
        <Button variant="secondary" onClick={leave} disabled={leaveBusy}><LogOut className="inline mr-2" size={19}/>{leaveBusy?t('leaving'):t('leaveConfirmBtn')}</Button>
      </section>
    </div>
  </main>;
}
