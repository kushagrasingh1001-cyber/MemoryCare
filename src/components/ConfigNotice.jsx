import {useState} from 'react';
import {AlertTriangle,X} from 'lucide-react';

/**
 * Developer-facing banner. It only appears when the Firebase web-app keys are
 * missing or still the sandbox placeholders — in that case sign-in and all data
 * screens cannot work, and the reason should be obvious instead of looking like
 * a broken app.
 */
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
const looksLikePlaceholder = /PLACEHOLDER|sandbox/i.test(apiKey) || /sandbox/i.test(projectId);
const configured = Boolean(apiKey && projectId && !looksLikePlaceholder);

export default function ConfigNotice(){
  const [hidden,setHidden]=useState(false);
  if(configured||hidden)return null;

  return <div className="config-notice" role="status">
    <AlertTriangle size={20}/>
    <span>
      <b>Firebase is not configured in this environment.</b>{' '}
      The interface (including all four languages) works, but signing in, reminders,
      memories and the pager need your own Firebase keys: copy <code>.env.example</code> to{' '}
      <code>.env</code> and fill in the values from your Firebase console.
    </span>
    <button type="button" onClick={()=>setHidden(true)} aria-label="Hide notice"><X size={18}/></button>
  </div>;
}
