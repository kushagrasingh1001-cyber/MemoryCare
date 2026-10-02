import {useCallback,useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {localeFor,speechLocalesFor} from '../services/locale';

export function useVoiceNarration(autoText=''){
  const {i18n}=useTranslation();
  const [enabled,setEnabledState]=useState(()=>localStorage.getItem('memorycare-voice')!=='off');

  const setEnabled=useCallback(value=>{
    setEnabledState(value);
    localStorage.setItem('memorycare-voice',value?'on':'off');
    if(!value&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  },[]);

  const speak=useCallback(text=>{
    if(!enabled||!('speechSynthesis' in window)||!text)return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    const wanted=speechLocalesFor(i18n.language);
    u.lang=localeFor(i18n.language);
    u.rate=.88;
    const voices=window.speechSynthesis.getVoices();
    const preferred=wanted.map(tag=>voices.find(v=>v.lang?.toLowerCase().startsWith(tag))).find(Boolean);
    if(preferred){u.voice=preferred;u.lang=preferred.lang;}
    window.speechSynthesis.speak(u);
  },[enabled,i18n.language]);

  useEffect(()=>{if(autoText&&enabled)speak(autoText);return()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();}},[autoText,enabled,speak]);
  return {speak,stop:()=>window.speechSynthesis?.cancel?.(),enabled,setEnabled,toggle:()=>setEnabled(!enabled)};
}

export function startVoiceInput({language='en',onResult}){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R)throw new Error('Speech recognition not supported');
  const r=new R();
  r.lang=localeFor(language);
  r.onresult=e=>onResult(e.results[0][0].transcript);
  r.start();
  return r;
}
