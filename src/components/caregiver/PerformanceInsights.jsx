import {useTranslation} from 'react-i18next';
import Card from '../ui/Card';
import {TrendingUp,TriangleAlert} from 'lucide-react';

export default function PerformanceInsights({sessions=[]}){
  const {t}=useTranslation();
  const groups={};
  sessions.forEach(s=>{(groups[s.gameType]??=[]).push(s)});

  const rows=Object.entries(groups).map(([game,list])=>{
    const sorted=[...list].sort((x,y)=>(y.completedAt?.toMillis?.()??y.completedAt??0)-(x.completedAt?.toMillis?.()??x.completedAt??0));
    const recent=sorted.slice(0,3),older=sorted.slice(3,6);
    const avg=items=>items.length?Math.round(items.reduce((total,v)=>total+Number(v.accuracy||0),0)/items.length):null;
    const r=avg(recent),o=avg(older);
    return {game,recent:r,delta:o==null?null:r-o,level:sorted[0]?.difficulty||1};
  }).sort((a,b)=>(b.recent||0)-(a.recent||0));

  const gameName=value=>{
    const map={memory:'memoryGame',attention:'attentionGame',routine:'routineGame',wordRecall:'wordRecall',numberSequence:'numberSequence'};
    return map[value]?t(map[value]):value;
  };

  return <Card>
    <h2 className="text-xl mb-1">{t('performanceInsights')}</h2>
    <p className="text-sm text-slate-500 mb-4">{t('performanceInsightsSub')}</p>
    {!rows.length?<p className="text-slate-500">{t('sessionsAppear')}</p>:
      <div className="space-y-3">
        {rows.map(row=><div key={row.game} className="rounded-2xl bg-slate-50 p-4 flex items-center gap-3">
          <span className={`w-11 h-11 rounded-xl grid place-items-center ${row.delta!=null&&row.delta<-10?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
            {row.delta!=null&&row.delta<-10?<TriangleAlert/>:<TrendingUp/>}
          </span>
          <div className="flex-1">
            <b>{gameName(row.game)}</b>
            <p className="text-sm text-slate-500">{t('recentAvg',{value:row.recent,level:row.level})}</p>
          </div>
          <span className="font-black">{row.delta==null?t('newLabel'):`${row.delta>=0?'+':''}${row.delta}%`}</span>
        </div>)}
      </div>}
  </Card>;
}
