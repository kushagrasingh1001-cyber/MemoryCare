import {Volume2,VolumeX} from 'lucide-react';
import {useTranslation} from 'react-i18next';
export default function VoiceToggle({enabled,onToggle}){const {t}=useTranslation();return <button type="button" onClick={onToggle} className="voice-toggle" aria-pressed={enabled}>{enabled?<Volume2 size={20}/>:<VolumeX size={20}/>}<span>{enabled?t('voiceOn'):t('voiceOff')}</span></button>}
