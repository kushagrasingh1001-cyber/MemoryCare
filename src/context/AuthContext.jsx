import {createContext,useContext,useEffect,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth'; import {doc,onSnapshot} from 'firebase/firestore'; import {auth,db} from '../firebase/firebase';
const C=createContext(null); export const useAuth=()=>useContext(C);
export function AuthProvider({children}){const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u); if(!u){setProfile(null);setLoading(false);return;} return onSnapshot(doc(db,'users',u.uid),s=>{setProfile(s.exists()?s.data():null);setLoading(false);});}),[]);
return <C.Provider value={{user,profile,loading}}>{children}</C.Provider>}
