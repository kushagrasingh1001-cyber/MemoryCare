import {Link,useParams} from 'react-router-dom';
import MemoryGame from '../../games/MemoryGame';
import AttentionGame from '../../games/AttentionGame';
import RoutineGame from '../../games/RoutineGame';
import WordRecallGame from '../../games/WordRecallGame';
import NumberSequenceGame from '../../games/NumberSequenceGame';
import NavBar from '../../components/ui/NavBar';
import LanguageToggle from '../../components/LanguageToggle';
import LogoutButton from '../../components/LogoutButton';
import {useTranslation} from 'react-i18next';
import {Brain,Eye,CalendarCheck,MessageCircle,Hash,ChevronRight,Sparkles} from 'lucide-react';

export default function GamesPage(){
  const {gameType}=useParams();
  const {t}=useTranslation();

  const games=[
    ['memory',Brain,'memoryGame','memoryGameSub','bg-violet-500'],
    ['attention',Eye,'attentionGame','attentionGameSub','bg-sky-500'],
    ['routine',CalendarCheck,'routineGame','routineGameSub','bg-emerald-500'],
    ['wordRecall',MessageCircle,'wordRecall','wordRecallSub','bg-rose-500'],
    ['numberSequence',Hash,'numberSequence','numberSequenceSub','bg-amber-500'],
  ];

  if(gameType==='memory')return <MemoryGame/>;
  if(gameType==='attention')return <AttentionGame/>;
  if(gameType==='routine')return <RoutineGame/>;
  if(gameType==='wordRecall')return <WordRecallGame/>;
  if(gameType==='numberSequence')return <NumberSequenceGame/>;

  return <main className="page premium-page">
    <div className="max-w-4xl mx-auto relative z-10">
      <header className="top-shell">
        <div className="brand-mark"><span className="brand-icon"><Sparkles size={23}/></span><span>{t('app')}</span></div>
        <div className="header-actions"><LanguageToggle/><LogoutButton compact/></div>
      </header>
      <div className="welcome-block compact-welcome">
        <span className="eyebrow">🧠 {t('app')}</span>
        <h1>{t('brainGames')}</h1>
        <p>{t('brainGamesSub')}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-7">
        {games.map(([id,Icon,key,sub,accent])=><Link key={id} to={`/patient/games/${id}`} className="soft-card p-5 flex items-center gap-4 group">
          <div className={`w-14 h-14 shrink-0 rounded-2xl text-white flex items-center justify-center ${accent}`}><Icon/></div>
          <div className="flex-1"><h2 className="text-xl">{t(key)}</h2><p className="text-slate-500 text-base">{t(sub)}</p></div>
          <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition"/>
        </Link>)}
      </div>
      <div className="rounded-3xl bg-gradient-to-r from-care-600 to-skycare-500 text-white p-6 mt-6">
        <p className="font-black text-xl">{t('adaptiveDifficulty')}</p>
        <p className="mt-1 opacity-90">{t('adaptiveDifficultySub')}</p>
      </div>
    </div>
    <NavBar/>
  </main>;
}
