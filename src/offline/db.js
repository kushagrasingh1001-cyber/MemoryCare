import Dexie from 'dexie'; export const localDB=new Dexie('MemoryCareDB'); localDB.version(1).stores({gameSessions:'sessionId,patientUid,gameType,synced,completedAt'});
