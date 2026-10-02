import {LogOut} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {logout} from '../services/authService';

export default function LogoutButton({compact=false}){
  const nav=useNavigate();
  const {t}=useTranslation();
  async function go(){
    await logout();
    nav('/login',{replace:true});
  }
  return <button onClick={go} className={`logout-btn ${compact?'logout-compact':''}`} title={t('signOutInstead')}>
    <LogOut size={20}/><span>{t('signOutInstead')}</span>
  </button>;
}
