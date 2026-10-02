import {useState} from 'react';
import {useNavigate,Link,Navigate} from 'react-router-dom';
import {Brain,Heart,ShieldCheck,Mail,Lock,ArrowRight,Sparkles,Users,UserRound,KeyRound} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {loginAndResolve,resetPassword,authErrorKey,homeRouteForRole} from '../../services/authService';
import {useAuth} from '../../context/AuthContext';
import {LoadingScreen} from '../../components/AccountRecovery';

export default function Login(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[err,setErr]=useState(''),
        [note,setNote]=useState(''),[busy,setBusy]=useState(false),[resetting,setResetting]=useState(false);
  const nav=useNavigate();
  const {t}=useTranslation();
  const {user,profile,loading,profileLoading}=useAuth();

  if(loading||(user&&profileLoading))return <LoadingScreen/>;
  if(user&&profile)return <Navigate to={homeRouteForRole(profile.role)} replace/>;

  async function go(e){
    e.preventDefault();
    setErr('');setNote('');setBusy(true);
    try{
      const result=await loginAndResolve(email.trim(),password);
      // Route from the role stored in Firestore, never from stale UI state.
      nav(result.profile?result.home:'/account-help',{replace:true});
    }catch(x){
      setErr(t(authErrorKey(x)));
    }finally{
      setBusy(false);
    }
  }

  async function forgot(){
    setErr('');setNote('');
    if(!email.trim()){setErr(t('errResetEmpty'));return;}
    setResetting(true);
    try{
      await resetPassword(email.trim());
      setNote(t('resetLinkSent'));
    }catch(x){
      setErr(t(authErrorKey(x)));
    }finally{
      setResetting(false);
    }
  }

  return <main className="auth-page">
    <div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
    <section className="auth-shell">
      <aside className="auth-story">
        <div className="auth-brand"><span className="auth-brand-cube"><Sparkles size={26}/></span><span>{t('app')}</span></div>
        <div className="auth-hero-copy">
          <span className="auth-kicker">MEMORIES • CARE • CONNECTION</span>
          <h1>Every memory deserves a little <em>care.</em></h1>
          <p>A calm companion for cognitive activities, meaningful family memories and everyday support.</p>
        </div>
        <div className="auth-feature-row">
          <div><Brain/><span><b>{t('brainGames')}</b><small>{t('brainGamesSub')}</small></span></div>
          <div><Heart/><span><b>{t('memoryGallery')}</b><small>{t('memoryGallerySub')}</small></span></div>
          <div><ShieldCheck/><span><b>{t('familyTitle')}</b><small>{t('myFamilySub')}</small></span></div>
        </div>
        <div className="auth-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-center"><Brain size={58}/></div><div className="floating-chip chip-one">♥ {t('family')}</div><div className="floating-chip chip-two">✦ {t('memoryGallery')}</div></div>
      </aside>
      <section className="auth-panel-wrap"><div className="auth-panel">
        <span className="auth-mini-badge">{t('signInBadge')}</span>
        <h2>{t('signInTitle')}</h2>
        <p className="auth-sub">{t('signInSub')}</p>
        <form onSubmit={go} className="auth-form">
          <label>{t('emailAddress')}<div className="auth-input"><Mail size={20}/><input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div></label>
          <label>{t('passwordLabel')}<div className="auth-input"><Lock size={20}/><input type="password" required autoComplete="current-password" placeholder={t('createPassword')} value={password} onChange={e=>setPassword(e.target.value)}/></div></label>
          {err&&<div className="auth-error" role="alert">{err}</div>}
          {note&&<div className="auth-note" role="status">{note}</div>}
          <button className="auth-primary" disabled={busy}>{busy?t('signingIn'):t('signIn')}<ArrowRight size={21}/></button>
          <button type="button" className="auth-link" onClick={forgot} disabled={resetting}><KeyRound size={17}/>{resetting?t('working'):t('forgotPassword')}</button>
        </form>
        <div className="auth-divider"><span>{t('newToMemoryCare')}</span></div>
        <div className="auth-role-grid">
          <Link to="/signup/patient" className="auth-role-card"><span className="role-icon patient"><UserRound/></span><span><b>{t('iAmPatient')}</b><small>{t('patientCardSub')}</small></span><ArrowRight/></Link>
          <Link to="/signup/caregiver" className="auth-role-card"><span className="role-icon caregiver"><Users/></span><span><b>{t('iAmCaregiver')}</b><small>{t('caregiverCardSub')}</small></span><ArrowRight/></Link>
        </div>
      </div></section>
    </section>
  </main>;
}
