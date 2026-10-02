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

const FALLBACK_WORDS=['Bihu','Bamboo','River','Tea','Hill','Family','Market'];
const FALLBACK_DISTRACTORS=['Moon','Shoe','Train'];

export default function WordRecallGame(){
  const {profile}=useAuth();
  const {t}=useTranslation();
  const level=profile?.currentDifficultyLevel?.wordRecall||1;
  const count=difficultyConfig.wordRecall[level];

  const translated=t('wordRecallWords',{returnObjects:true});
  const words=Array.isArray(translated)&&translated.length?translated:FALLBACK_WORDS;
  const translatedDistractors=t('distractorWords',{returnObjects:true});
  const distractors=Array.isArray(translatedDistractors)&&translatedDistractors.length?translatedDistractors:FALLBACK_DISTRACTORS;

  const [round,setRound]=useState(0);
  const [phase,setPhase]=useState('study');
  const [picked,setPicked]=useState([]);
  const [finished,setFinished]=useState(false);
  const [nextLevel,setNextLevel]=useState(level);
  const [score,setScore]=useState(null);
  const [start,setStart]=useState(()=>Date.now());

  const targets=useMemo(()=>words.slice(0,count),[words.join('|'),count,round]);
  const choices=useMemo(()=>{
    const extra=count<=3?distractors.slice(0,1):distractors.slice(0,2);
    return [...targets,...extra].sort(()=>Math.random()-.5);
  },[targets.join('|'),round]);

  const voice=useVoiceNarration(phase==='study'?`${count} ${t('wordsLabel',{count})}. ${t('iAmReady')}`:t('wordInstruction'));

  useEffect(()=>{setPhase('study');setPicked([]);setFinished(false);setScore(null);setStart(Date.now());},[round,level]);

  function restart(){setNextLevel(level);setRound(r=>r+1);}

  async function check(){
    const correct=picked.filter(x=>targets.includes(x)).length;
    const wrong=picked.filter(x=>!targets.includes(x)).length;
    const accuracy=Math.max(0,Math.round((correct-wrong)/targets.length*100));
    setScore(accuracy);
    const nl=await finishGame({patientUid:profile.uid,groupId:profile.groupId,gameType:'wordRecall',difficulty:level,accuracy,responseTimeMs:Date.now()-start,hintsUsed:0});
    setNextLevel(nl);
    setFinished(true);
  }

  return <main className="page max-w-xl mx-auto">
    <div className="flex justify-between items-start gap-3">
      <div>
        <span className="pill">{t('levelLabel',{level})}</span>
        <h1 className="text-title mt-2">💬 {t('wordRecall')}</h1>
        <p className="text-slate-600">{t('wordsLabel',{count})}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <VoiceToggle enabled={voice.enabled} onToggle={voice.toggle}/>
        <Link to="/patient/games"><Button variant="secondary">{t('back')}</Button></Link>
      </div>
    </div>

    {phase==='study'?<section>
      <p className="my-4 font-bold">{t('studyWords')}</p>
      <div className="grid grid-cols-2 gap-3 my-5">{targets.map(word=><div className="bg-white border rounded-2xl p-5 text-xl font-bold" key={word}>{word}</div>)}</div>
      <Button onClick={()=>setPhase('recall')}>{t('iAmReady')}</Button>
    </section>:<section>
      <p className="my-4 font-bold">{t('selectWords')}</p>
      <div className="grid grid-cols-2 gap-3">
        {choices.map(word=><Button key={word} variant={picked.includes(word)?'primary':'secondary'} disabled={finished} onClick={()=>setPicked(p=>p.includes(word)?p.filter(v=>v!==word):[...p,word])}>{word}</Button>)}
      </div>
      {!finished&&<Button className="w-full mt-5" onClick={check} disabled={!picked.length}>{t('finish')}</Button>}
    </section>}

    {finished&&<section className="mt-6 space-y-3 hero-card p-6">
      <Trophy size={44} className="text-amber-500"/>
      <p className="text-slate-500 font-bold">{t('gameComplete')}</p>
      <p className="text-2xl font-bold">{t('accuracy')}: {score}%</p>
      <p><b>{t('yourAnswer')}:</b> {picked.join(', ')||'—'}</p>
      <p className="font-bold">{nextLevel>level?t('levelUp'):nextLevel<level?t('levelDown'):t('levelSame',{level})}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full" onClick={restart}><RotateCcw className="inline mr-2" size={19}/>{nextLevel>level?`${t('nextLevelBtn')} · ${nextLevel}`:t('playAgain')}</Button>
        <Link to="/patient/home"><Button className="w-full"><Home className="inline mr-2" size={19}/>{t('backHome')}</Button></Link>
      </div>
    </section>}
  </main>;
}
