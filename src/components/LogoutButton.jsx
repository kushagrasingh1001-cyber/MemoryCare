import {LogOut} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {logout} from '../services/authService';
export default function LogoutButton({compact=false}){const nav=useNavigate();async function go(){await logout();nav('/login',{replace:true});}return <button onClick={go} className={`logout-btn ${compact?'logout-compact':''}`} title="Logout"><LogOut size={20}/><span>Logout</span></button>}
