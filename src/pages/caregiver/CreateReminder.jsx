import {useEffect,useState} from 'react';
import {addDoc,collection,doc,getDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {db} from '../../firebase/firebase';
import {useAuth} from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import LanguageToggle from '../../components/LanguageToggle';
import LogoutButton from '../../components/LogoutButton';
import {BellPlus,Sparkles,CalendarDays} from 'lucide-react';

function toLocalInput(date){
  const pad=n=>String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CreateReminder(){
  const {profile}=useAuth();
  const {t}=useTranslation();
  const [patientId,setPatientId]=useState('');
  const [msg,setMsg]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [f,setF]=useState({type:'medicine',title:'',time:'',instructions:''});

  useEffect(()=>{
    if(!profile?.groupId)return;
    getDoc(doc(db,'groups',profile.groupId)).then(x=>setPatientId(x.data()?.patientUid||'')).catch(()=>{});
  },[profile?.groupId]);

  function quick(minutes){
    setF(prev=>({...prev,time:toLocalInput(new Date(Date.now()+minutes*60000))}));
  }

  async function submit(e){
    e.preventDefault();
    setMsg('');setError('');
    const when=f.time?new Date(f.time):null;
    if(!when||Number.isNaN(when.getTime())||when.getTime()<Date.now()-60000){
      setError(t('pickFutureTime'));
      return;
    }
    if(!patientId){
      setError(t('errGeneric'));
      return;
    }
    setBusy(true);
    try{
      await addDoc(collection(db,'reminders'),{
        patientId,
        groupId:profile.groupId,
        type:f.type,
        title:f.title.trim(),
        instructions:f.instructions.trim(),
        scheduledTime:Timestamp.fromDate(when),
        status:'pending',
        createdBy:profile.uid,
        createdAt:serverTimestamp(),
      });
      setF({type:'medicine',title:'',time:'',instructions:''});
      setMsg(t('reminderScheduled'));
    }catch(err){
      setError(err.message||t('errGeneric'));
    }finally{
      setBusy(false);
    }
  }

  return <main className="page premium-page">
    <div className="max-w-2xl mx-auto relative z-10">
      <header className="top-shell">
        <div className="brand-mark"><span className="brand-icon"><Sparkles size={23}/></span><span>{t('app')}</span></div>
        <div className="header-actions"><LanguageToggle/><LogoutButton compact/></div>
      </header>

      <Link to="/caregiver/dashboard" className="font-bold text-care-700 inline-flex items-center gap-2 mt-5">← {t('back')}</Link>

      <section className="hero-card p-7 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center"><BellPlus/></div>
          <div><h1 className="text-3xl font-black">{t('scheduleReminder')}</h1><p className="text-slate-600">{t('scheduleReminderSub')}</p></div>
        </div>

        <form className="space-y-5 mt-7" onSubmit={submit}>
          <div>
            <label className="label">{t('reminderType')}</label>
            <select className="field" value={f.type} onChange={e=>setF({...f,type:e.target.value})}>
              <option value="medicine">💊 {t('typeMedicine')}</option>
              <option value="hydration">💧 {t('typeHydration')}</option>
              <option value="appointment">🩺 {t('typeAppointment')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('reminderTitle')}</label>
            <input className="field" required placeholder={t('reminderTitlePlaceholder')} value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
          </div>
          <div>
            <label className="label"><CalendarDays className="inline mr-2" size={18}/>{t('dateTime')}</label>
            <input className="field" required type="datetime-local" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
            <p className="label mt-3">{t('quickTimes')}</p>
            <div className="quick-time-row">
              <button type="button" className="quick-time" onClick={()=>quick(10)}>{t('inTenMinutes')}</button>
              <button type="button" className="quick-time" onClick={()=>quick(60)}>{t('inOneHour')}</button>
            </div>
          </div>
          <div>
            <label className="label">{t('instructions')} <span className="font-normal opacity-60">({t('optional')})</span></label>
            <textarea className="field min-h-28 py-3" placeholder={t('instructionsPlaceholder')} value={f.instructions} onChange={e=>setF({...f,instructions:e.target.value})}/>
          </div>
          <Button className="w-full" disabled={busy}>{busy?t('working'):t('scheduleBtn')}</Button>
          {msg&&<p className="rounded-2xl bg-care-100 p-4 font-bold text-care-700" role="status">✓ {msg}</p>}
          {error&&<p className="rounded-2xl bg-rose-100 p-4 font-bold text-rose-700" role="alert">{error}</p>}
        </form>
      </section>
    </div>
  </main>;
}
