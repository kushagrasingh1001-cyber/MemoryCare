import {collection,doc,getDocs,limit,orderBy,query,updateDoc} from 'firebase/firestore';
import {db} from '../firebase/firebase';
import {saveGameSessionOffline,syncGameSessions} from '../offline/sync';
import {calculateNextDifficulty} from '../services/difficulty';
import {trackPatientActivity} from '../services/activityService';

/**
 * Saves a finished game session (offline first), pushes it to Firestore when the
 * device is online and returns the next difficulty level for that game.
 */
export async function finishGame({patientUid,groupId,gameType,difficulty,accuracy,responseTimeMs,hintsUsed,extra={}}){
  const sessionId=crypto.randomUUID();
  const completedAt=Date.now();
  const session={sessionId,patientUid,groupId,gameType,difficulty,accuracy,responseTimeMs,hintsUsed,completedAt,...extra};

  await saveGameSessionOffline(session);

  let history=[session];
  if(navigator.onLine){
    await syncGameSessions().catch(()=>{});
    try{
      const snap=await getDocs(query(collection(db,'users',patientUid,'gameSessions'),orderBy('completedAt','desc'),limit(20)));
      history=snap.docs.map(d=>d.data()).filter(s=>s.gameType===gameType).slice(0,2);
    }catch{/* offline: fall back to the local session */}
  }

  const next=calculateNextDifficulty(history,difficulty);

  try{
    await updateDoc(doc(db,'users',patientUid),{[`currentDifficultyLevel.${gameType}`]:next});
  }catch{/* rules or offline - the next session will retry */}

  trackPatientActivity({
    patientUid,
    groupId,
    type:'game_completed',
    title:`${gameType} · ${accuracy}%`,
    metadata:{sessionId,gameType,accuracy,difficulty},
  }).catch(()=>{});

  return next;
}
