import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Sparkles,Users,Mail,Phone,Lock,KeyRound,ArrowLeft,ArrowRight,CheckCircle2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {signupCaregiver,authErrorKey} from '../../services/authService';
import {useAuth} from '../../context/AuthContext';

export default function CaregiverSignup(){
  const {t}=useTranslation();
  const [f,setF]=useState({name:'',email:'',password:'',phone:'',inviteCode:''}),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const nav=useNavigate();
  const {refreshProfile}=useAuth();
  const ch=e=>setF({...f,[e.target.name]:e.target.value});

  async function go(e){
    e.preventDefault();
    setBusy(true);setErr('');
    try{
      await signupCaregiver(f);
      await refreshProfile();
      setMsg(t('connectedSub'));
    }catch(x){
      setErr(t(authErrorKey(x)));
    }finally{
      setBusy(false);
    }
  }

  return <main className="auth-page caregiver-auth">
    <div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
    <section className="signup-shell">
      <div className="signup-top"><Link to="/login" className="auth-back"><ArrowLeft/> {t('backToLogin')}</Link><div className="auth-brand"><span className="auth-brand-cube"><Sparkles size={24}/></span><span>{t('app')}</span></div></div>
      <div className="signup-layout">
        <aside className="signup-message">
          <span className="auth-kicker">{t('caregiverLabel').toUpperCase()}</span>
          <h1>{t('caregiverSignupIntro')}</h1>
          <p>{t('caregiverSignupSub')}</p>
          <div className="signup-visual caregiver-visual"><Users size={78}/><span>{t('inviteShareNote')}</span></div>
        </aside>
        <section className="auth-panel signup-panel">
          <span className="auth-mini-badge">{t('caregiverSignupBadge')}</span>
          <h2>{t('caregiverSignupTitle')}</h2>
          {!msg?<form className="auth-form" onSubmit={go}>
            <AuthField icon={<Users/>} name="name" placeholder={t('fullName')} value={f.name} onChange={ch}/>
            <AuthField icon={<Mail/>} name="email" type="email" placeholder={t('emailAddress')} value={f.email} onChange={ch}/>
            <AuthField icon={<Phone/>} name="phone" placeholder={t('phoneLabel')} value={f.phone} onChange={ch}/>
            <AuthField icon={<Lock/>} name="password" type="password" placeholder={t('createPassword')} value={f.password} onChange={ch}/>
            <AuthField icon={<KeyRound/>} name="inviteCode" placeholder={t('inviteCodeLabel')} value={f.inviteCode} onChange={e=>setF({...f,inviteCode:e.target.value.toUpperCase()})}/>
            {err&&<div className="auth-error" role="alert">{err}</div>}
            <button className="auth-primary" disabled={busy}>{busy?t('joining'):t('joinCareSpace')}<ArrowRight/></button>
          </form>:<div className="invite-success">
            <CheckCircle2 size={58}/>
            <h3>{t('connectedTitle')}</h3>
            <p>{msg}</p>
            <button className="auth-primary" onClick={()=>nav('/caregiver/dashboard',{replace:true})}>{t('openCaregiverDashboard')}<ArrowRight/></button>
          </div>}
        </section>
      </div>
    </section>
  </main>;
}

function AuthField({icon,name,type='text',placeholder,value,onChange}){
  return <label>{placeholder}<div className="auth-input">{icon}<input required name={name} type={type} placeholder={placeholder} value={value} onChange={onChange}/></div></label>;
}
