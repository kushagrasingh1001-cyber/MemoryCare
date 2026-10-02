import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,Legend} from 'recharts';
import {useTranslation} from 'react-i18next';
import Card from '../ui/Card';

export default function PerformanceChart({sessions=[]}){
  const {t}=useTranslation();
  const data=[...sessions].reverse().map((x,i)=>({name:i+1,accuracy:x.accuracy||0}));

  return <Card>
    <h2 className="text-xl mb-4">{t('cognitivePerformance')}</h2>
    {!data.length?<p className="text-slate-500">{t('sessionsAppear')}</p>:
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="name"/>
            <YAxis domain={[0,100]}/>
            <Tooltip/>
            <Legend/>
            <Line name={t('accuracy')} dataKey="accuracy" stroke="#247461" strokeWidth={3}/>
          </LineChart>
        </ResponsiveContainer>
      </div>}
  </Card>;
}
