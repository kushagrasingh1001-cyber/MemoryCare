import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Globe,Check} from 'lucide-react';
import {LANGUAGES,changeAppLanguage} from '../i18n';

export default function LanguageToggle({variant='default'}){
  const {i18n}=useTranslation();
  const [open,setOpen]=useState(false);
  const current=LANGUAGES.find(l=>i18n.language===l.code)||LANGUAGES[0];
  const choose=code=>{changeAppLanguage(code);setOpen(false)};

  return <div className={`language-picker ${variant==='compact'?'language-picker-compact':''}`}>
    <button type="button" className="language-trigger" onClick={()=>setOpen(o=>!o)} aria-expanded={open} aria-haspopup="listbox" title="Change language">
      <Globe size={20}/><span>{current.native}</span>
    </button>
    {open&&<>
      <button type="button" className="language-backdrop" aria-label="Close language menu" onClick={()=>setOpen(false)}/>
      <ul className="language-menu" role="listbox" aria-label="Language">
        {LANGUAGES.map(l=><li key={l.code}>
          <button type="button" role="option" aria-selected={l.code===i18n.language} className={l.code===i18n.language?'language-active':''} onClick={()=>choose(l.code)}>
            <span><b>{l.native}</b><small>{l.label}</small></span>
            {l.code===i18n.language&&<Check size={18}/>}
          </button>
        </li>)}
      </ul>
    </>}
  </div>
}
