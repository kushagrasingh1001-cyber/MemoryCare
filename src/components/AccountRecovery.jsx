import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {AlertTriangle,KeyRound,LifeBuoy,RefreshCw,Sparkles,UserRoundPlus,LogOut,ShieldAlert} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {logout,rejoinGroup,restorePatientProfile,authErrorKey} from '../services/authService';
import Button from './ui/Button';

function Shell({icon:Icon,tone='info',title,children}){
  return <main className="page min-h-screen grid place-items-center">
    <section className={`recovery-card recovery-${tone}`}>
      <span className="recovery-icon"><Icon size={30}/></span>
      <h1 className="text-2xl font-black">{title}</h1>
      {children}
    </section>
  </main>;
}

function RejoinForm({onDone}){
  const {t}=useTranslation();
  const {user,refreshProfile}=useAuth();
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);

  async function submit(e){
    e.preventDefault();
    setBusy(true);setError('');
    try{
      await rejoinGroup({user,inviteCode:code});
      await refreshProfile();
      setDone(true);
      onDone?.();
    }catch(err){
      setError(t(authErrorKey(err)));
    }finally{
      setBusy(false);
    }
  }

  if(done)return <div className="recovery-note"><RefreshCw size={18}/><span>{t('connectedSub')}</span></div>;

  return <form className="auth-form mt-4" onSubmit={submit}>
    <label>{t('inviteCodeLabel')}
      <div className="auth-input"><KeyRound size={20}/><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder={t('inviteCodePlaceholder')} maxLength={10}/></div>
    </label>
    {error&&<div className="auth-error">{error}</div>}
    <Button className="w-full" disabled={busy||code.trim().length<4}>{busy?t('joining'):t('rejoinWithCode')}</Button>
  </form>;
}

export function ProfileRecovery({errorCode}){
  const {t}=useTranslation();
  const nav=useNavigate();
  const [restoring,setRestoring]=useState(false);
  const [restoreMsg,setRestoreMsg]=useState('');
  const {user,refreshProfile}=useAuth();

  async function restore(){
    if(!user){return;}
    setRestoring(true);setRestoreMsg('');
    try{
      const result=await restorePatientProfile(user.uid);
      await refreshProfile();
      nav(result.role==='patient'?'/patient/home':'/caregiver/dashboard',{replace:true});
    }catch(err){
      setRestoreMsg(err?.message==='GROUP_MISSING'
        ? t('profileMissingPatientHint')
        : t(authErrorKey(err)));
    }finally{
      setRestoring(false);
    }
  }

  async function signOutNow(){
    await logout();
    nav('/login',{replace:true});
  }

  return <Shell icon={AlertTriangle} tone="warning" title={t('profileMissingTitle')}>
    <p className="recovery-body">{t('profileMissingBody')}{errorCode==='permission'?' (permission denied)':''}</p>
    <div className="recovery-grid">
      <div className="recovery-block">
        <h2><UserRoundPlus size={20}/> {t('patientLabel')}</h2>
        <p>{t('profileMissingPatientHint')}</p>
        <Button variant="secondary" className="w-full" onClick={restore} disabled={restoring}>
          {restoring?t('working'):t('createPatientSpaceLink')}
        </Button>
        {restoreMsg&&<p className="recovery-hint">{restoreMsg}</p>}
      </div>
      <div className="recovery-block">
        <h2><LifeBuoy size={20}/> {t('caregiverLabel')}</h2>
        <p>{t('profileMissingCaregiverHint')}</p>
        <RejoinForm/>
      </div>
    </div>
    <button type="button" className="recovery-signout" onClick={signOutNow}><LogOut size={18}/>{t('signOutInstead')}</button>
  </Shell>;
}

export function RemovedFromSpace(){
  const {t}=useTranslation();
  const nav=useNavigate();
  return <Shell icon={ShieldAlert} tone="danger" title={t('removedTitle')}>
    <p className="recovery-body">{t('removedBody')}</p>
    <RejoinForm onDone={()=>nav('/caregiver/dashboard',{replace:true})}/>
    <button type="button" className="recovery-signout" onClick={async()=>{await logout();nav('/login',{replace:true});}}><LogOut size={18}/>{t('signOutInstead')}</button>
  </Shell>;
}

export function GroupProblem(){
  const {t}=useTranslation();
  const nav=useNavigate();
  return <Shell icon={AlertTriangle} tone="warning" title={t('errGroupFull')}>
    <p className="recovery-body">{t('errGeneric')}</p>
    <div className="recovery-note"><Sparkles size={18}/><span>{t('pagerNoGroup')}</span></div>
    <button type="button" className="recovery-signout" onClick={async()=>{await logout();nav('/login',{replace:true});}}><LogOut size={18}/>{t('signOutInstead')}</button>
  </Shell>;
}

export function LoadingScreen({label}){
  const {t}=useTranslation();
  return <main className="page min-h-screen grid place-items-center">
    <div className="loading-card"><span className="loading-dot"/><p>{label||t('loading')}</p></div>
  </main>;
}
