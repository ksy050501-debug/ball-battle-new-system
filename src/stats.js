export function createScore(a,b) {
  return {aId:a.id,bId:b.id,aName:a.name,bName:b.name,aMaxHp:a.maxHp,bMaxHp:b.maxHp,
    aWins:0,bWins:0,drawCount:0,count:0,aHpTotal:0,bHpTotal:0,at:Date.now()};
}
export function recordRound(score,result) {
  score.count++;
  if(result.draw){score.drawCount++;return;}
  if(result.winner===score.aId){score.aWins++;score.aHpTotal+=result.survivors.find(a=>a.id===score.aId)?.hp||0;}
  else if(result.winner===score.bId){score.bWins++;score.bHpTotal+=result.survivors.find(a=>a.id===score.bId)?.hp||0;}
  else throw new Error("Unexpected winner");
}
export function matchupLine(s) {
  const short=name=>name.trim().split(/\s+/).pop();
  const hp=(name,total,wins,max)=>{
    const avg=wins?total/wins:0;
    return short(name)+" 평균잔HP "+avg.toFixed(1)+"/"+max+" ("+Math.round(avg/max*100)+"%)";
  };
  return short(s.aName)+"vs."+short(s.bName)+" "+s.aWins+" "+(s.drawCount?s.drawCount+" ":"")+s.bWins
    +" | "+hp(s.aName,s.aHpTotal,s.aWins,s.aMaxHp)+" | "+hp(s.bName,s.bHpTotal,s.bWins,s.bMaxHp);
}
