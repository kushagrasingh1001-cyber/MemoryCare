import {useTranslation} from 'react-i18next';
import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';

export function hoursAgo(ts){
  if(!ts?.toDate)return null;
  return Math.floor((Date.now()-ts.toDate().getTime())/3600000);
}

export default function PatientStatusCard({patient}){
  const {t}=useTranslation();
  const h=hoursAgo(patient?.lastActiveTimestamp);
  const inactive=h===null||h>=24;
  const initials=(patient?.name||'?').trim().charAt(0).toUpperCase();

  return <Card>
    <div className="flex gap-4 items-center">
      {patient?.photoUrl
        ? <img className="w-20 h-20 rounded-full object-cover bg-slate-200" src={patient.photoUrl} alt={patient?.name||t('patientLabel')}/>
        : <span className="w-20 h-20 rounded-full grid place-items-center bg-care-100 text-care-700 text-3xl font-black">{initials}</span>}
      <div>
        <h2 className="text-2xl">{patient?.name||t('patientLabel')}</h2>
        <StatusBadge status={inactive?'alert':'active'}>
          {inactive?t('inactiveLabel'):t('activeLabel')} — {h===null?t('noActivityYet'):t('hoursAgo',{count:h})}
        </StatusBadge>
        <p className="text-sm text-slate-500 mt-2">{t('notMedicalAdvice')}</p>
      </div>
    </div>
  </Card>;
}
