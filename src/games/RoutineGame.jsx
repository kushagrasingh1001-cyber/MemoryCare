import {useVoiceNarration} from '../hooks/useVoiceNarration';
import {useTranslation} from 'react-i18next';
import VoiceToggle from '../components/VoiceToggle';
import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {difficultyConfig} from '../services/difficulty';
import {finishGame} from './gameUtils';
import Button from '../components/ui/Button';
import {Home,RotateCcw,Trophy} from 'lucide-react';

const FALLBACK=['Prepare tea leaves','Boil water','Put tea in cup','Pour hot water','Wait a little','Add milk','Enjoy tea with family'];

export default function RoutineGame(){
  const {profile}=useAuth();
  const {t}=useTranslation();
  const level=profile?.currentDifficultyLevel?.routine||1;
  const all=t('routineSteps',{returnObjects:true});
  const source=Array.isArray(all)&&all.length?all:FALLBACK;
  const steps=source.slice(0,difficultyConfig.routine[level]);

  const [round,setRound]=useState(0);
  const [picked,setPicked]=useState([]);
  const [msg,setMsg]=useState('');
  const [finished,setFinished]=useState(false);
  const [nextLevel,setNextLevel]=useState(level);
  const [score,setScore]=useState(null);
  const [start,setStart]=useState(()=>Date.now());

  const instruction=t('routineInstruction');
  const voice=useVoiceNarration(msg||instruction);
  const shuffled=useMemo(()=>[...steps].sort(()=>Math.random()-.5),[steps.join('|'),round]);

  useEffect(()=>{setPicked([]);setMsg('');setFinished(false);setScore(null);setStart(Date.now());},[round,level]);

  function restart(){setNextLevel(level);setRound(r=>r+1);}

  async function pick(step){
    if(finished||picked.includes(step))return;
    const next=[...picked,step];
    setPicked(next);
    if(next.length===steps.length){
      const correct=next.filter((x,i)=>x===steps[i]).length;
      const accuracy=Math.round(correct/steps.length*100);
      setScore(accuracy);
      setMsg(correct===steps.length?t('routineSuccess'):t('routineRetry'));
      const nl=await finishGame({patientUid:profile.uid,groupId:profile.groupId,gameType:'routine',difficulty:level,accuracy,responseTimeMs:Date.now()-start,hintsUsed:correct===steps.length?0:1});
      setNextLevel(nl);
      setFinished(true);
    }
  }

  return <main className="page max-w-xl mx-auto">
    <div className="flex justify-between items-start gap-3">
      <div>
        <span className="pill">{t('levelLabel',{level})}</span>
        <h1 className="text-title mt-2">📋 {t('routineGame')}</h1>
        <p className="text-slate-600">{t('stepsLabel',{count:steps.length})}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <VoiceToggle enabled={voice.enabled} onToggle={voice.toggle}/>
        <Link to="/patient/games"><Button variant="secondary">{t('back')}</Button></Link>
      </div>
    </div>
    <p className="my-4 font-bold" role="status">{msg||instruction}</p>
    <div className="space-y-3">
      {shuffled.filter(x=>!picked.includes(x)).map(step=><Button key={step} variant="secondary" className="w-full" onClick={()=>pick(step)}>{step}</Button>)}
    </div>
    <div className="mt-5 rounded-2xl bg-white/70 p-4"><b>{t('yourOrder')}: </b>{picked.length?picked.join(' → '):'—'}</div>
    {finished&&<section className="mt-6 space-y-3 hero-card p-6">
      <Trophy size={44} className="text-amber-500"/>
      <p className="text-slate-500 font-bold">{t('gameComplete')}</p>
      <p><b>{t('correctOrder')}:</b> {steps.join(' → ')}</p>
      <p className="text-2xl font-bold">{t('accuracy')}: {score}%</p>
      <p className="font-bold">{nextLevel>level?t('levelUp'):nextLevel<level?t('levelDown'):t('levelSame',{level})}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full" onClick={restart}><RotateCcw className="inline mr-2" size={19}/>{nextLevel>level?`${t('nextLevelBtn')} · ${nextLevel}`:t('playAgain')}</Button>
        <Link to="/patient/home"><Button className="w-full"><Home className="inline mr-2" size={19}/>{t('backHome')}</Button></Link>
      </div>
    </section>}
  </main>;
}
