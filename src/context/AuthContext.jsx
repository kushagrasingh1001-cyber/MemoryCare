import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,onSnapshot} from 'firebase/firestore';
import {auth,db} from '../firebase/firebase';
import {fetchUserProfile} from '../services/authService';

const C=createContext(null);
export const useAuth=()=>useContext(C);

/**
 * AuthProvider keeps three things in sync:
 *  - the Firebase auth user
 *  - the Firestore profile document for *that* user
 *  - a status flag so screens can wait instead of guessing the role
 *
 * Earlier versions never unsubscribed the profile listener, which made a
 * caregiver sometimes open the previous patient's screens. Every listener here
 * is tied to the current uid and cleaned up when the account changes.
 */
export function AuthProvider({children}){
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [profileLoading,setProfileLoading]=useState(false);
  const [profileError,setProfileError]=useState('');
  const uidRef=useRef(null);

  useEffect(()=>{
    let profileUnsub=null;
    let profileTimer=null;
    const stopProfile=()=>{profileUnsub?.();profileUnsub=null;if(profileTimer)clearTimeout(profileTimer);profileTimer=null;};

    const authUnsub=onAuthStateChanged(auth,u=>{
      stopProfile();
      const uid=u?.uid||null;
      uidRef.current=uid;
      setUser(u);
      setProfile(null);
      setProfileError('');
      if(!uid){setLoading(false);setProfileLoading(false);return;}

      setProfileLoading(true);
      let settled=false;
      // Never leave the UI hanging forever if Firestore is unreachable.
      profileTimer=setTimeout(()=>{
        if(settled)return;
        settled=true;
        setProfileError('timeout');
        setProfileLoading(false);
        setLoading(false);
      },10000);

      profileUnsub=onSnapshot(doc(db,'users',uid),snap=>{
        if(uidRef.current!==uid)return; // stale listener from a previous account
        settled=true;
        if(profileTimer)clearTimeout(profileTimer);
        if(snap.exists()){setProfile({uid,...snap.data()});setProfileError('');}
        else {setProfile(null);setProfileError('missing');}
        setProfileLoading(false);
        setLoading(false);
      },err=>{
        if(uidRef.current!==uid)return;
        settled=true;
        if(profileTimer)clearTimeout(profileTimer);
        setProfile(null);
        setProfileError(err?.code==='permission-denied'?'permission':'unavailable');
        setProfileLoading(false);
        setLoading(false);
      });
    });

    return ()=>{stopProfile();authUnsub();};
  },[]);

  const refreshProfile=useCallback(async()=>{
    const uid=uidRef.current;
    if(!uid)return null;
    const fresh=await fetchUserProfile(uid);
    if(uidRef.current!==uid)return null;
    if(fresh){setProfile(fresh);setProfileError('');}
    return fresh;
  },[/* uid lives in a ref */]);

  return <C.Provider value={{user,profile,loading,profileLoading,profileError,refreshProfile}}>{children}</C.Provider>;
}
