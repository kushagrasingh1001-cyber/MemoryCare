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

const sets=[
  ['🪘','🪘','🪘','🎸'],
  ['🎋','🎋','🎋','🌵'],
  ['🏔️','🏔️','🏔️','🏖️'],
  ['🍚','🍚','🍚','🍕'],
  ['🌺','🌺','🌺','🌻'],
];

export default function AttentionGame(){
  const {profile}=useAuth();
  const {t}=useTranslation();
  const level=profile?.currentDifficultyLevel?.attention||1;
  const n=difficultyConfig.attention[level];
  const [round,setRound]=useState(0);
  const [attempts,setAttempts]=useState(0);
  const [msg,setMsg]=useState('');
  const [finished,setFinished]=useState(false);
  const [nextLevel,setNextLevel]=useState(level);
  const [score,setScore]=useState(null);
  const [start,setStart]=useState(()=>Date.now());

  const instruction=t('attentionInstruction');
  const voice=useVoiceNarration(msg||instruction);
  const theme=sets[(level-1)%sets.length];
  const odd=useMemo(()=>Math.floor(Math.random()*n),[n,round]);
  const positions=useMemo(()=>Array.from({length:n},(_,i)=>i),[n,round]);

  useEffect(()=>{setAttempts(0);setMsg('');setFinished(false);setScore(null);setStart(Date.now());},[round,level]);

  function restart(){setNextLevel(level);setRound(r=>r+1);}

  async function tap(i){
    if(finished)return;
    const a=attempts+1;
    setAttempts(a);
    if(i===odd){
      const accuracy=Math.min(100,Math.round(100/a));
      setScore(accuracy);
      setMsg(t('greatSpotting'));
      const next=await finishGame({patientUid:profile.uid,groupId:profile.groupId,gameType:'attention',difficulty:level,accuracy,responseTimeMs:Date.now()-start,hintsUsed:0,extra:{theme:'North East India'}});
      setNextLevel(next);
      setFinished(true);
    }else{
      setMsg(t('lookAgain'));
    }
  }

  return <main className="page max-w-xl mx-auto">
    <div className="flex justify-between items-start gap-3">
      <div>
        <span className="pill">{t('levelLabel',{level})}</span>
        <h1 className="text-title mt-2">👀 {t('attentionGame')}</h1>
        <p className="text-slate-600">{t('picturesLabel',{count:n})} · {t('northEastInspired')}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <VoiceToggle enabled={voice.enabled} onToggle={voice.toggle}/>
        <Link to="/patient/games"><Button variant="secondary">{t('back')}</Button></Link>
      </div>
    </div>
    <p className="my-4 font-bold" role="status">{msg||instruction}</p>
    <div className="grid grid-cols-3 gap-3">
      {positions.map(i=><Button key={i} variant="secondary" className="aspect-square text-4xl" aria-label={`picture ${i+1}`} onClick={()=>tap(i)}>{i===odd?theme[3]:theme[0]}</Button>)}
    </div>
    {finished&&<section className="mt-6 space-y-3 hero-card p-6">
      <Trophy size={44} className="text-amber-500"/>
      <p className="text-slate-500 font-bold">{t('gameComplete')}</p>
      <p className="text-2xl font-bold">{t('accuracy')}: {score}%</p>
      <p>{t('levelUpNote')}</p>
      <p className="font-bold">{nextLevel>level?t('levelUp'):nextLevel<level?t('levelDown'):t('levelSame',{level})}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full" onClick={restart}><RotateCcw className="inline mr-2" size={19}/>{nextLevel>level?`${t('nextLevelBtn')} · ${nextLevel}`:t('playAgain')}</Button>
        <Link to="/patient/home"><Button className="w-full"><Home className="inline mr-2" size={19}/>{t('backHome')}</Button></Link>
      </div>
    </section>}
  </main>;
}
