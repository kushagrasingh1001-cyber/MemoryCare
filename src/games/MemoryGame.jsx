import {useTranslation} from 'react-i18next';
import VoiceToggle from '../components/VoiceToggle';
import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {difficultyConfig} from '../services/difficulty';
import {finishGame} from './gameUtils';
import Button from '../components/ui/Button';
import {useVoiceNarration} from '../hooks/useVoiceNarration';
import {Home,RotateCcw,Trophy} from 'lucide-react';

const icons=['🪘','🎋','🏔️','🌺','🧣','🍚','🌿','☕'];

export default function MemoryGame(){
  const {profile}=useAuth();
  const {t}=useTranslation();
  const level=profile?.currentDifficultyLevel?.memory||1;
  const count=difficultyConfig.memory[level];
  const pairs=count/2;

  const [round,setRound]=useState(0);
  const [open,setOpen]=useState([]);
  const [done,setDone]=useState([]);
  const [tries,setTries]=useState(0);
  const [start,setStart]=useState(()=>Date.now());
  const [msg,setMsg]=useState('');
  const [finished,setFinished]=useState(false);
  const [nextLevel,setNextLevel]=useState(level);
  const [score,setScore]=useState(null);

  const instruction=t('memoryInstruction');
  const voice=useVoiceNarration(msg||instruction);

  const cards=useMemo(()=>{
    const picked=icons.slice(0,pairs);
    return [...picked,...picked].sort(()=>Math.random()-.5).map((v,i)=>({id:i,v}));
  },[pairs,round]);

  useEffect(()=>{
    setOpen([]);setDone([]);setTries(0);setStart(Date.now());setMsg('');setFinished(false);setScore(null);
  },[round,level]);

  function restart(){
    setNextLevel(level);
    setRound(r=>r+1);
  }

  function tap(card){
    if(open.length===2||done.includes(card.id)||open.some(x=>x.id===card.id)||finished)return;
    const next=[...open,card];
    setOpen(next);
    if(next.length===2){
      const attempts=tries+1;
      setTries(attempts);
      setTimeout(()=>{
        if(next[0].v===next[1].v){
          const matched=[...done,next[0].id,next[1].id];
          setDone(matched);
          setMsg(t('pairFound'));
          if(matched.length===cards.length){
            const accuracy=Math.max(0,Math.min(100,Math.round((cards.length/2)/attempts*100)));
            setScore(accuracy);
            finishGame({patientUid:profile.uid,groupId:profile.groupId,gameType:'memory',difficulty:level,accuracy,responseTimeMs:Date.now()-start,hintsUsed:0,extra:{theme:'North East India'}})
              .then(n=>{setNextLevel(n);setFinished(true)});
          }
        }else{
          setMsg(t('tryAgainGentle'));
        }
        setOpen([]);
      },650);
    }
  }

  return <main className="page max-w-xl mx-auto">
    <div className="flex justify-between items-start gap-3">
      <div>
        <span className="pill">{t('levelLabel',{level})}</span>
        <h1 className="text-title mt-2">🧠 {t('memoryGame')}</h1>
        <p className="text-slate-600">{t('cardsLabel',{count})} · {t('northEastInspired')}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <VoiceToggle enabled={voice.enabled} onToggle={voice.toggle}/>
        <Link to="/patient/games"><Button variant="secondary">{t('back')}</Button></Link>
      </div>
    </div>
    <p className="my-4 font-bold" role="status">{msg||instruction}</p>
    <div className="grid grid-cols-4 gap-3">
      {cards.map(c=><Button key={c.id} variant="secondary" className="aspect-square text-3xl" aria-label={open.some(x=>x.id===c.id)||done.includes(c.id)?c.v:'hidden card'} onClick={()=>tap(c)}>{open.some(x=>x.id===c.id)||done.includes(c.id)?c.v:'?'}</Button>)}
    </div>
    {finished&&<section className="mt-6 space-y-3 hero-card p-6">
      <Trophy size={44} className="text-amber-500"/>
      <p className="text-slate-500 font-bold">{t('gameComplete')}</p>
      <p className="text-2xl font-bold">{t('accuracy')}: {score}%</p>
      <p>{t('levelUpNote')}</p>
      <p className="font-bold">{nextLevel>level?t('levelUp'):nextLevel<level?t('levelDown'):t('levelSame',{level})} {t('nextTime')}: {t('levelLabel',{level:nextLevel})}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full" onClick={restart}><RotateCcw className="inline mr-2" size={19}/>{nextLevel>level?`${t('nextLevelBtn')} · ${nextLevel}`:t('playAgain')}</Button>
        <Link to="/patient/home"><Button className="w-full"><Home className="inline mr-2" size={19}/>{t('backHome')}</Button></Link>
      </div>
    </section>}
  </main>;
}
