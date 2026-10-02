import {useState} from 'react';
import {doc,updateDoc,serverTimestamp} from 'firebase/firestore';
import {useTranslation} from 'react-i18next';
import {db} from '../../firebase/firebase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {formatDateTime} from '../../services/locale';

export default function AlertHistory({groupId,alerts=[]}){
  const {t,i18n}=useTranslation();
  const [busyId,setBusyId]=useState('');
  const [err,setErr]=useState('');

  async function acknowledge(id){
    setBusyId(id);setErr('');
    try{
      await updateDoc(doc(db,'groups',groupId,'alerts',id),{acknowledged:true,acknowledgedAt:serverTimestamp()});
    }catch(e){
      setErr(e.message||t('errGeneric'));
    }finally{
      setBusyId('');
    }
  }

  return <Card>
    <h2 className="text-xl mb-3">{t('inactivityAlerts')}</h2>
    {err&&<p className="mb-3 font-bold text-rose-700">{err}</p>}
    {!alerts.length&&<p className="text-slate-500">{t('noAlertsYet')}</p>}
    {alerts.map(a=><div key={a.id} className="border-b py-3 flex justify-between items-center gap-3 flex-wrap">
      <span>
        {a.message||t('inactiveLabel')}
        <span className="block text-sm text-slate-500">{formatDateTime(a.createdAt,i18n.language)}</span>
      </span>
      {a.acknowledged
        ? <span className="reminder-status is-done">{t('acknowledged')}</span>
        : <Button onClick={()=>acknowledge(a.id)} disabled={busyId===a.id}>{busyId===a.id?t('working'):t('acknowledge')}</Button>}
    </div>)}
  </Card>;
}
