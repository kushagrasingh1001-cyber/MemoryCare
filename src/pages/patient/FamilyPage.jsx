import {useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {useTranslation} from 'react-i18next';
import {db} from '../../firebase/firebase';
import {useAuth} from '../../context/AuthContext';
import {useGroup} from '../../hooks/useGroup';
import {removeCaregiverFromGroup,authErrorKey} from '../../services/authService';
import NavBar from '../../components/ui/NavBar';
import LanguageToggle from '../../components/LanguageToggle';
import LogoutButton from '../../components/LogoutButton';
import Button from '../../components/ui/Button';
import {Users,Copy,Check,Share2,Trash2,ShieldAlert,UserRound,HeartHandshake,Sparkles} from 'lucide-react';

export default function FamilyPage(){
  const {t}=useTranslation();
  const {profile}=useAuth();
  const {group,groupLoading,status}=useGroup(profile?.groupId);
  const [members,setMembers]=useState([]);
  const [copied,setCopied]=useState(false);
  const [pending,setPending]=useState(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [err,setErr]=useState('');

  useEffect(()=>{
    if(!group)return;
    const ids=[group.patientUid,...(group.caregiverUids||[])].filter(Boolean);
    const data={};
    const unsubs=ids.map(uid=>onSnapshot(doc(db,'users',uid),u=>{
      if(u.exists())data[uid]=u.data();
      setMembers(ids.map(id=>data[id]).filter(Boolean));
    }));
    setMembers(ids.map(id=>data[id]).filter(Boolean));
    return ()=>unsubs.forEach(f=>f());
  },[group?.id,group?.patientUid,(group?.caregiverUids||[]).join(',')]);

  async function copyCode(){
    try{await navigator.clipboard?.writeText(group.inviteCode||'');setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{}
  }

  async function shareCode(){
    const text=`${t('inviteCodeTitle')}: ${group.inviteCode}\n${t('inviteCodeHelp')}`;
    try{
      if(navigator.share)await navigator.share({title:t('app'),text});
      else await copyCode();
    }catch{}
  }

  async function confirmRemove(){
    if(!pending)return;
    setBusy(true);setErr('');setMsg('');
    try{
      await removeCaregiverFromGroup({groupId:profile.groupId,caregiverUid:pending.uid});
      setMsg(`${pending.name} — ${t('removeConfirmBtn')} ✓`);
      setPending(null);
    }catch(e){
      setErr(t(authErrorKey(e)));
    }finally{
      setBusy(false);
    }
  }

  const caregivers=(group?.caregiverUids||[]).map(uid=>members.find(m=>m.uid===uid)).filter(Boolean);
  const patient=members.find(m=>m.uid===group?.patientUid);
  const canRemove=profile?.role==='patient';

  return <main className="page premium-page">
    <div className="max-w-4xl mx-auto relative z-10">
      <header className="top-shell">
        <div className="brand-mark"><span className="brand-icon"><Sparkles size={23}/></span><span>{t('app')}</span></div>
        <div className="header-actions"><LanguageToggle/><LogoutButton compact/></div>
      </header>

      <section className="welcome-block compact-welcome">
        <span className="eyebrow">{t('myFamily')}</span>
        <h1>{t('familyTitle')}</h1>
        <p>{t('familyIntro')}</p>
      </section>

      {groupLoading&&!group&&<p className="mt-6 font-bold">{t('loading')}</p>}

      {group&&<section className="family-invite-card">
        <div className="family-invite-icon"><HeartHandshake/></div>
        <div className="flex-1">
          <span className="eyebrow">{t('inviteCodeTitle')}</span>
          <p className="family-code">{group.inviteCode}</p>
          <p className="family-hint">{t('inviteCodeHelp')}</p>
          <p className="family-count"><Users size={17}/> {t('caregiversLinked')}: <b>{(group.caregiverUids||[]).length} / 4</b></p>
        </div>
        <div className="family-invite-actions">
          <Button variant="secondary" onClick={copyCode}>{copied?<Check className="inline mr-2" size={18}/>:<Copy className="inline mr-2" size={18}/>}{copied?t('codeCopied'):t('copyCode')}</Button>
          <Button variant="soft" onClick={shareCode}><Share2 className="inline mr-2" size={18}/>{t('shareCode')}</Button>
        </div>
      </section>}

      {msg&&<div className="auth-note mt-4" role="status">{msg}</div>}
      {err&&<div className="auth-error mt-4" role="alert">{err}</div>}

      <div className="space-y-4 mt-6">
        {patient&&<MemberCard member={patient} label={t('patientLabel')} icon={UserRound} me={patient.uid===profile?.uid} youLabel={t('youLabel')}/>}
        {caregivers.map(c=><MemberCard key={c.uid} member={c} label={t('caregiverLabel')} icon={Users} me={c.uid===profile?.uid} youLabel={t('youLabel')}
          onRemove={canRemove?()=>{setErr('');setMsg('');setPending(c)}:undefined} removeLabel={t('removeCaregiver')}/>)}
      </div>

      {group&&(group.caregiverUids||[]).length===0&&<p className="mt-5 rounded-3xl bg-white/70 p-5 font-bold">{t('noCaregivers')}</p>}
      {!groupLoading&&status!=='ready'&&status!=='loading'&&<p className="mt-5 rounded-3xl bg-white/70 p-5 font-bold">{t('errGeneric')}</p>}
    </div>

    {pending&&<div className="pager-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setPending(null)}}>
      <section className="pager-confirm" role="dialog" aria-modal="true" aria-labelledby="remove-title">
        <span className="pager-confirm-icon"><ShieldAlert/></span>
        <h2 id="remove-title">{t('removeTitle')}</h2>
        <p>{t('removeBody',{name:pending.name||t('caregiverLabel')})}</p>
        <div className="flex gap-3 mt-5">
          <Button className="flex-1" variant="secondary" onClick={()=>setPending(null)} disabled={busy}>{t('cancel')}</Button>
          <button type="button" className="pager-confirm-delete" onClick={confirmRemove} disabled={busy}>{busy?t('removing'):t('removeConfirmBtn')}</button>
        </div>
      </section>
    </div>}

    <NavBar/>
  </main>;
}

function MemberCard({member,label,icon:Icon,me,youLabel,onRemove,removeLabel}){
  return <article className="family-member">
    <span className={`family-avatar ${member.role==='patient'?'is-patient':''}`}><Icon size={24}/></span>
    <div className="flex-1 min-w-0">
      <h2 className="text-xl font-black flex items-center gap-2 flex-wrap">{member.name||'—'} {me&&<span className="family-you">{youLabel}</span>}</h2>
      <p className="family-role">{label}</p>
      {member.email&&<p className="family-line">{member.email}</p>}
      {member.phone&&<p className="family-line">{member.phone}</p>}
    </div>
    {onRemove&&<button type="button" className="family-remove" onClick={onRemove} title={removeLabel} aria-label={`${removeLabel} — ${member.name}`}><Trash2 size={20}/></button>}
  </article>;
}
