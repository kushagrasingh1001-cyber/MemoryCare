import {useTranslation} from 'react-i18next';
import Card from '../ui/Card';
import {formatDateTime} from '../../services/locale';

export default function ReminderLog({items=[]}){
  const {t,i18n}=useTranslation();
  const sorted=[...items].sort((a,b)=>(b.scheduledTime?.toMillis?.()||0)-(a.scheduledTime?.toMillis?.()||0)).slice(0,12);

  return <Card>
    <h2 className="text-xl mb-3">{t('reminderLog')}</h2>
    {!sorted.length&&<p className="text-slate-500">{t('noReminders')}</p>}
    <div className="space-y-2">
      {sorted.map(x=><div key={x.id} className="flex justify-between items-center gap-3 border-b py-2">
        <span>
          <b>{x.title}</b>
          <span className="block text-sm text-slate-500">{formatDateTime(x.scheduledTime,i18n.language)}</span>
        </span>
        <span className={`reminder-status is-${x.status||'pending'}`}>{t(`status_${x.status||'pending'}`)}</span>
      </div>)}
    </div>
  </Card>;
}
