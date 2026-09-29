import {useState} from 'react';
import {useNavigate,Link} from 'react-router-dom';
import {Brain,Heart,ShieldCheck,Mail,Lock,ArrowRight,Sparkles,Users,UserRound} from 'lucide-react';
import {login} from '../../services/authService';

export default function Login(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);const nav=useNavigate();
 async function go(e){e.preventDefault();setErr('');setBusy(true);try{await login(email,password);nav('/');}catch(x){setErr(x.message)}finally{setBusy(false)}}
 return <main className="auth-page">
  <div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
  <section className="auth-shell">
   <aside className="auth-story">
    <div className="auth-brand"><span className="auth-brand-cube"><Sparkles size={26}/></span><span>MemoryCare</span></div>
    <div className="auth-hero-copy"><span className="auth-kicker">MEMORIES • CARE • CONNECTION</span><h1>Every memory deserves a little <em>care.</em></h1><p>A calm companion for cognitive activities, meaningful family memories and everyday support.</p></div>
    <div className="auth-feature-row"><div><Brain/><span><b>Gentle games</b><small>Adaptive cognitive activities</small></span></div><div><Heart/><span><b>Family memories</b><small>Stay close to familiar moments</small></span></div><div><ShieldCheck/><span><b>Connected care</b><small>Family support in one place</small></span></div></div>
    <div className="auth-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-center"><Brain size={58}/></div><div className="floating-chip chip-one">♥ Family</div><div className="floating-chip chip-two">✦ Remember</div></div>
   </aside>
   <section className="auth-panel-wrap"><div className="auth-panel">
    <span className="auth-mini-badge">Welcome back</span><h2>Sign in to MemoryCare</h2><p className="auth-sub">Continue as a patient or caregiver with the same secure login.</p>
    <form onSubmit={go} className="auth-form">
     <label>Email address<div className="auth-input"><Mail size={20}/><input type="email" required placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div></label>
     <label>Password<div className="auth-input"><Lock size={20}/><input type="password" required placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}/></div></label>
     {err&&<div className="auth-error">{err}</div>}
     <button className="auth-primary" disabled={busy}>{busy?'Signing in...':'Sign In'}<ArrowRight size={21}/></button>
    </form>
    <div className="auth-divider"><span>New to MemoryCare?</span></div>
    <div className="auth-role-grid"><Link to="/signup/patient" className="auth-role-card"><span className="role-icon patient"><UserRound/></span><span><b>I am a Patient</b><small>Create my care space</small></span><ArrowRight/></Link><Link to="/signup/caregiver" className="auth-role-card"><span className="role-icon caregiver"><Users/></span><span><b>I am a Caregiver</b><small>Join with an invite code</small></span><ArrowRight/></Link></div>
   </div></section>
  </section>
 </main>
}
