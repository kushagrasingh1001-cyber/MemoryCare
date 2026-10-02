import {useVoiceNarration} from '../hooks/useVoiceNarration';
import VoiceToggle from '../components/VoiceToggle';
import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {difficultyConfig} from '../services/difficulty';
import {finishGame} from './gameUtils';
import Button from '../components/ui/Button';
import {useTranslation} from 'react-i18next';
import {RotateCcw,Home,Trophy} from 'lucide-react';

export default function NumberSequenceGame(){
  const {profile}=useAuth();
  const {t}=useTranslation();
  const level=profile?.currentDifficultyLevel?.numberSequence||1;
  const count=difficultyConfig.numberSequence[level];

  const [round,setRound]=useState(0);
  const [phase,setPhase]=useState('study');
  const [picked,setPicked]=useState([]);
  const [finished,setFinished]=useState(false);
  const [nextLevel,setNextLevel]=useState(level);
  const [score,setScore]=useState(null);
  const [start,setStart]=useState(()=>Date.now());

  const target=useMemo(()=>Array.from({length:count},()=>Math.floor(Math.random()*9)+1),[count,round]);
  const voice=useVoiceNarration(phase==='study'?t('rememberNumbers',{count}):t('tapSameOrder'));

  useEffect(()=>{setPhase('study');setPicked([]);setFinished(false);setScore(null);setStart(Date.now());},[round,level]);

  function restart(){setNextLevel(level);setRound(r=>r+1);}

  function add(n){if(finished||picked.length>=target.length)return;setPicked(p=>[...p,n]);}

  async function submit(){
    if(picked.length!==target.length)return;
    const correct=picked.filter((x,i)=>x===target[i]).length;
    const accuracy=Math.round(correct/target.length*100);
    setScore(accuracy);
    const nl=await finishGame({patientUid:profile.uid,groupId:profile.groupId,gameType:'numberSequence',difficulty:level,accuracy,responseTimeMs:Date.now()-start,hintsUsed:0});
    setNextLevel(nl);
    setFinished(true);
  }

  return <main className="page"><div className="max-w-2xl mx-auto">
    <div className="flex justify-between items-start gap-3">
      <div>
        <span className="pill">{t('levelLabel',{level})}</span>
        <h1 className="text-4xl font-black mt-3">🔢 {t('numberSequence')}</h1>
        <p className="text-slate-600 mt-2">{t('rememberNumbers',{count})}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <VoiceToggle enabled={voice.enabled} onToggle={voice.toggle}/>
        <Link to="/patient/games"><Button variant="secondary">{t('back')}</Button></Link>
      </div>
    </div>

    {phase==='study'?<section className="hero-card p-8 my-8 text-center">
      <p className="text-slate-600 font-bold">{t('takeMoment')}</p>
      <div className="text-5xl md:text-6xl tracking-[.35em] font-black my-10">{target.join(' ')}</div>
      <Button onClick={()=>setPhase('recall')}>{t('iAmReady')}</Button>
    </section>:!finished?<section className="hero-card p-6 my-8">
      <p className="text-xl font-bold text-center">{t('tapSameOrder')}</p>
      <div className="grid grid-cols-3 gap-3 mt-6">
        {[1,2,3,4,5,6,7,8,9].map(n=><Button key={n} variant="secondary" className="text-2xl" onClick={()=>add(n)}>{n}</Button>)}
      </div>
      <div className="rounded-2xl bg-care-50 p-4 mt-5 min-h-20">
        <p className="text-sm font-bold text-slate-500">{t('yourAnswer')}</p>
        <p className="text-2xl font-black tracking-widest mt-1">{picked.length?picked.join('  '):'—'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Button variant="secondary" onClick={()=>setPicked([])} disabled={!picked.length}><RotateCcw className="inline mr-2" size={20}/>{t('clear')}</Button>
        <Button onClick={submit} disabled={picked.length!==target.length}>{t('submit')}</Button>
      </div>
    </section>:<section className="hero-card p-8 my-8 text-center">
      <Trophy size={54} className="mx-auto text-amber-500"/>
      <p className="text-slate-500 font-bold mt-4">{t('gameComplete')}</p>
      <div className="text-6xl font-black mt-2">{score}%</div>
      <p className="text-xl font-bold">{t('accuracy')}</p>
      <div className="rounded-2xl bg-care-50 p-4 mt-6">
        <p>{t('correctSequence')}: <b>{target.join(' ')}</b></p>
        <p className="mt-2">{nextLevel>level?t('levelUp'):nextLevel<level?t('levelDown'):t('levelSame',{level})}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        <Button variant="secondary" onClick={restart}>{nextLevel>level?`${t('nextLevelBtn')} · ${nextLevel}`:t('playAgain')}</Button>
        <Link to="/patient/home"><Button className="w-full"><Home className="inline mr-2" size={20}/>{t('backHome')}</Button></Link>
      </div>
    </section>}
  </div></main>;
}
