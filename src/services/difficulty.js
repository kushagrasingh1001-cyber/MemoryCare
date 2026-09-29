export function calculateNextDifficulty(sessionHistory,currentLevel=1){
  const recent=[...sessionHistory]
    .sort((a,b)=>(b.completedAt?.toMillis?.()??b.completedAt??0)-(a.completedAt?.toMillis?.()??a.completedAt??0))
    .slice(0,2);
  if(recent.length<2)return currentLevel;
  const scores=recent.map(s=>Number(s.accuracy||0));
  if(scores.every(a=>a>=80))return Math.min(5,currentLevel+1);
  if(scores.every(a=>a<=50))return Math.max(1,currentLevel-1);
  return currentLevel;
}
export const difficultyConfig={
 memory:{1:4,2:6,3:8,4:12,5:16},
 attention:{1:4,2:6,3:8,4:10,5:12},
 routine:{1:3,2:4,3:5,4:6,5:7},
 wordRecall:{1:3,2:4,3:5,4:6,5:7},
 numberSequence:{1:3,2:4,3:5,4:6,5:7}
};
