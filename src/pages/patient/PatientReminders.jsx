import {useEffect,useMemo,useState} from 'react';
import {collection,onSnapshot,query,where,doc,updateDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
import {useTranslation} from 'react-i18next';
import {db} from '../../firebase/firebase';
import {useAuth} from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import {useVoiceNarration} from '../../hooks/useVoiceNarration';
import {trackPatientActivity} from '../../services/activityService';
import NavBar from '../../components/ui/NavBar';
import LanguageToggle from '../../components/LanguageToggle';
import LogoutButton from '../../components/LogoutButton';
import {formatDateTime} from '../../services/locale';
import {Bell,CheckCircle2,Clock,CalendarDays,Pill,Droplets,Stethoscope,AlarmClock,Sparkles} from 'lucide-react';

const iconFor=type=>type==='medicine'?Pill:type==='hydration'?Droplets:Stethoscope;

export default function PatientReminders(){
  const {profile}=useAuth();
  const {t,i18n}=useTranslation();
  const [items,setItems]=useState([]);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!profile?.uid)return;
    return onSnapshot(query(collection(db,'reminders'),where('patientId','==',profile.uid)),s=>setItems(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[profile?.uid]);

  const sorted=useMemo(()=>[...items].sort((a,b)=>(a.scheduledTime?.toMillis?.()||0)-(b.scheduledTime?.toMillis?.()||0)),[items]);
  const due=sorted.find(x=>x.status==='pending'&&x.scheduledTime?.toMillis?.()<=Date.now());
  const upcoming=sorted.filter(x=>x.status==='pending'&&x.id!==due?.id);
  const completed=sorted.filter(x=>x.status==='done').reverse();

  const {speak}=useVoiceNarration();
  useEffect(()=>{if(due)speak(due.title)},[due?.id]);

  async function markDone(){
    if(!due)return;
    setBusy(true);
    try{
      await updateDoc(doc(db,'reminders',due.id),{status:'done',acknowledgedAt:serverTimestamp()});
      await trackPatientActivity({
        patientUid:profile.uid,
        groupId:profile.groupId,
        type:due.type==='hydration'?'hydration_acknowledged':'medicine_acknowledged',
        title:`${due.title} acknowledged`,
        metadata:{reminderId:due.id},
      }).catch(()=>{});
    }finally{
      setBusy(false);
    }
  }

  async function snooze(){
    if(!due)return;
    setBusy(true);
    try{
      await updateDoc(doc(db,'reminders',due.id),{scheduledTime:Timestamp.fromMillis(Date.now()+10*60*1000),notificationSentAt:null});
    }finally{
      setBusy(false);
    }
  }

  if(due){
    const Icon=iconFor(due.type);
    return <main className="fixed inset-0 bg-care-50 flex flex-col items-center justify-center p-6 text-center overflow-auto">
      <div className="w-24 h-24 rounded-full bg-white shadow flex items-center justify-center text-care-700"><Icon size={48}/></div>
      <p className="font-bold text-care-700 mt-6">{t('nextReminder')}</p>
      <h1 className="text-4xl font-black mt-2">{due.title}</h1>
      <p className="text-xl mt-3">{formatDateTime(due.scheduledTime,i18n.language)}</p>
      {due.instructions&&<p className="text-slate-600 mt-2 max-w-md">{due.instructions}</p>}
      <Button className="w-full max-w-md text-2xl mt-8" onClick={markDone} disabled={busy}>✓ {t('done')}</Button>
      <button type="button" className="reminder-snooze" onClick={snooze} disabled={busy}><AlarmClock size={19}/>{t('remindLater')}</button>
    </main>;
  }

  return <main className="page premium-page">
    <div className="max-w-4xl mx-auto relative z-10">
      <header className="top-shell">
        <div className="brand-mark"><span className="brand-icon"><Sparkles size={23}/></span><span>{t('app')}</span></div>
        <div className="header-actions"><LanguageToggle/><LogoutButton compact/></div>
      </header>

      <div className="welcome-block compact-welcome">
        <span className="eyebrow">🔔 {t('myReminders')}</span>
        <h1>{t('myReminders')}</h1>
        <p>{t('scheduledByFamily')}</p>
      </div>

      {!items.length&&<div className="hero-card p-10 mt-6 text-center">
        <CalendarDays size={48} className="mx-auto text-care-600"/>
        <p className="text-2xl font-bold mt-4">{t('noReminders')}</p>
      </div>}

      {upcoming.length>0&&<section className="mt-8">
        <h2 className="text-2xl mb-4">{t('upcoming')}</h2>
        <div className="space-y-3">
          {upcoming.map(x=>{
            const Icon=iconFor(x.type);
            return <div className="soft-card p-5 flex items-center gap-4" key={x.id}>
              <div className="w-12 h-12 rounded-2xl bg-care-100 text-care-700 flex items-center justify-center"><Icon/></div>
              <div className="flex-1">
                <h3 className="text-xl">{x.title}</h3>
                <p className="text-slate-600"><Clock size={16} className="inline mr-1"/>{formatDateTime(x.scheduledTime,i18n.language)}</p>
                {x.instructions&&<p className="text-sm mt-1">{x.instructions}</p>}
              </div>
              <span className={`reminder-status is-${x.status}`}>{t(`status_${x.status}`)}</span>
            </div>;
          })}
        </div>
      </section>}

      {completed.length>0&&<section className="mt-8">
        <h2 className="text-2xl mb-4">{t('completed')}</h2>
        {completed.slice(0,5).map(x=><div className="soft-card p-4 mb-3 flex gap-3 items-center" key={x.id}>
          <CheckCircle2 className="text-care-600"/>
          <span className="font-bold flex-1">{x.title}</span>
          <span className="text-slate-500">{formatDateTime(x.acknowledgedAt||x.scheduledTime,i18n.language)}</span>
        </div>)}
      </section>}

    </div>
    <NavBar/>
  </main>;
}
