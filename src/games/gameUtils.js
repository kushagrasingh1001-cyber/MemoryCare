import {collection,doc,getDocs,limit,orderBy,query,updateDoc} from 'firebase/firestore';
import {db} from '../firebase/firebase';
import {saveGameSessionOffline,syncGameSessions} from '../offline/sync';
import {calculateNextDifficulty} from '../services/difficulty';
export async function finishGame({patientUid,groupId,gameType,difficulty,accuracy,responseTimeMs,hintsUsed,extra={}}){
 const sessionId=crypto.randomUUID(); const completedAt=Date.now();
 const session={sessionId,patientUid,groupId,gameType,difficulty,accuracy,responseTimeMs,hintsUsed,completedAt,...extra};
 await saveGameSessionOffline(session); if(navigator.onLine) await syncGameSessions();
 let history=[session];
 try{const snap=await getDocs(query(collection(db,'users',patientUid,'gameSessions'),orderBy('completedAt','desc'),limit(20)));history=snap.docs.map(d=>d.data()).filter(s=>s.gameType===gameType).slice(0,2);}catch{}
 const next=calculateNextDifficulty(history,difficulty);
 try{await updateDoc(doc(db,'users',patientUid),{[`currentDifficultyLevel.${gameType}`]:next});}catch{}
 return next;
}
