import {useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {db} from '../firebase/firebase';

/**
 * Subscribes to a patient group document.
 * `membership` is authoritative: it is what the Firestore rules use as well.
 * A caregiver who was removed by the patient gets status 'removed' (the rules
 * deny the read), which lets the UI explain what happened instead of failing silently.
 */
export function useGroup(groupId){
  const [group,setGroup]=useState(null);
  const [groupLoading,setGroupLoading]=useState(!!groupId);
  const [status,setStatus]=useState(groupId?'loading':'idle');

  useEffect(()=>{
    if(!groupId){setGroup(null);setStatus('idle');setGroupLoading(false);return;}
    setGroupLoading(true);
    setStatus('loading');
    return onSnapshot(doc(db,'groups',groupId),
      snap=>{
        setGroup(snap.exists()?{id:snap.id,...snap.data()}:null);
        setStatus(snap.exists()?'ready':'missing');
        setGroupLoading(false);
      },
      err=>{
        setGroup(null);
        setStatus(err?.code==='permission-denied'?'denied':'error');
        setGroupLoading(false);
      });
  },[groupId]);

  return {group,groupLoading,status};
}

export function membershipFor(profile,group){
  if(!profile)return 'unknown';
  if(!group)return 'unknown';
  if(profile.role==='patient')return group.patientUid===profile.uid?'member':'not-member';
  const caregivers=Array.isArray(group.caregiverUids)?group.caregiverUids:[];
  return caregivers.includes(profile.uid)?'member':'not-member';
}
