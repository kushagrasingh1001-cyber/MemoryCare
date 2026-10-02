import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Sparkles,UserRound,Mail,Phone,Lock,ArrowLeft,ArrowRight,Copy,CheckCircle2,Share2,Check} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {signupPatient,authErrorKey} from '../../services/authService';

export default function PatientSignup(){
  const {t}=useTranslation();
  const [f,setF]=useState({name:'',email:'',password:'',phone:''}),[result,setResult]=useState(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
  const nav=useNavigate();
  const change=e=>setF({...f,[e.target.name]:e.target.value});

  async function submit(e){
    e.preventDefault();
    setBusy(true);setErr('');
    try{setResult(await signupPatient(f))}
    catch(x){setErr(t(authErrorKey(x)))}
    finally{setBusy(false)}
  }

  async function copyCode(){
    try{await navigator.clipboard?.writeText(result.inviteCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{}
  }

  async function shareCode(){
    const text=`MemoryCare invite code: ${result.inviteCode}`;
    try{
      if(navigator.share)await navigator.share({title:'MemoryCare',text});
      else await copyCode();
    }catch{}
  }

  return <main className="auth-page">
    <div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
    <section className="signup-shell">
      <div className="signup-top"><Link to="/login" className="auth-back"><ArrowLeft/> {t('backToLogin')}</Link><div className="auth-brand"><span className="auth-brand-cube"><Sparkles size={24}/></span><span>{t('app')}</span></div></div>
      <div className="signup-layout">
        <aside className="signup-message">
          <span className="auth-kicker">{t('patientLabel').toUpperCase()}</span>
          <h1>{t('patientSignupIntro')}</h1>
          <p>{t('patientSignupSub')}</p>
          <div className="signup-visual patient-visual"><UserRound size={78}/><span>Safe • Simple • Familiar</span></div>
        </aside>
        <section className="auth-panel signup-panel">
          <span className="auth-mini-badge">{t('patientSignupBadge')}</span>
          <h2>{t('patientSignupTitle')}</h2>
          {!result?<form className="auth-form" onSubmit={submit}>
            <AuthField icon={<UserRound/>} name="name" placeholder={t('fullName')} value={f.name} onChange={change}/>
            <AuthField icon={<Mail/>} name="email" type="email" placeholder={t('emailAddress')} value={f.email} onChange={change}/>
            <AuthField icon={<Phone/>} name="phone" placeholder={t('phoneLabel')} value={f.phone} onChange={change}/>
            <AuthField icon={<Lock/>} name="password" type="password" placeholder={t('createPassword')} value={f.password} onChange={change}/>
            {err&&<div className="auth-error" role="alert">{err}</div>}
            <button className="auth-primary" disabled={busy}>{busy?t('creating'):t('createMyCareSpace')}<ArrowRight/></button>
          </form>:<div className="invite-success">
            <CheckCircle2 size={58}/>
            <h3>{t('spaceReadyTitle')}</h3>
            <p>{t('spaceReadySub')}</p>
            <div className="invite-code-box"><b>{result.inviteCode}</b><button onClick={copyCode} aria-label={t('copyCode')} title={t('copyCode')}>{copied?<Check/>:<Copy/>}</button></div>
            <p className="invite-share-note">{t('inviteShareNote')}</p>
            <button className="auth-secondary" onClick={shareCode}><Share2 size={19}/>{copied?t('codeCopied'):t('shareCode')}</button>
            <button className="auth-primary" onClick={()=>nav('/patient/home')}>{t('continueToMemoryCare')}<ArrowRight/></button>
          </div>}
        </section>
      </div>
    </section>
  </main>;
}

function AuthField({icon,name,type='text',placeholder,value,onChange}){
  return <label>{placeholder}<div className="auth-input">{icon}<input required name={name} type={type} placeholder={placeholder} value={value} onChange={onChange}/></div></label>;
}
