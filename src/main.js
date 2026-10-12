import {CHARACTERS} from "./characters.js";
import {SLOTS} from "./combat.js";
import {createWorld,stepWorld,STEP} from "./world.js";
import {createScore,recordRound,matchupLine} from "./stats.js";
const $=id=>document.getElementById(id),canvas=$("arena"),ctx=canvas.getContext("2d");
const STORAGE="ball-battle-new-system-v02-history";
let history=[];try{const data=JSON.parse(localStorage.getItem(STORAGE)||"[]");if(Array.isArray(data))history=data.filter(s=>s&&typeof s.aId==="string"&&typeof s.bId==="string"&&Number.isFinite(s.count)&&s.count>0&&typeof s.aName==="string"&&typeof s.bName==="string"&&Number.isFinite(s.aWins)&&Number.isFinite(s.bWins)&&Number.isFinite(s.drawCount)&&Number.isFinite(s.aHpTotal)&&Number.isFinite(s.bHpTotal)&&s.aMaxHp>0&&s.bMaxHp>0);}catch{}
const selections=new Map();
let mode="solo",filter="전체",running=false,speed=1,light=false,previous=null,accumulator=0;
let simBusy=false,cancelSim=false,world=createWorld([]),sound=true,volume=.6,audio=null,roundRecorded=false;
const message=text=>{$("message").textContent=text;};
function soundEffect(){
  if(!sound)return;
  try{audio??=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==="suspended")audio.resume();
    const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=440;
    gain.gain.setValueAtTime(volume*.04,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.06);
    osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.06);
  }catch{}
}
function addLog(text){const line=document.createElement("div");line.textContent=world.time.toFixed(1)+"초 · "+text;$("log").prepend(line);while($("log").children.length>30)$("log").lastChild.remove();}
function chosen(){return CHARACTERS.filter(d=>selections.has(d.id));}
function unlocked(){return !running&&!simBusy;}
function eligibleRoster(){return CHARACTERS.filter(d=>!d.simOnly&&d.kind!=="neutral"&&d.kind!=="summon");}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(history));}catch{message("전적은 현재 화면에 보관됩니다. 브라우저 저장소에 저장하지 못했습니다.");}renderHistory();}
function renderHistory(){
  $("history").replaceChildren();
  for(const s of history){const line=document.createElement("div");line.textContent=matchupLine(s);$("history").append(line);}
  $("copyMatchupBtn").textContent="전적 복사("+history.length+")";
}
function renderSelection(){
  $("selection").textContent=chosen().map(d=>d.name+(mode==="team"?" ["+selections.get(d.id)+"]":"")).join(", ")||"선택된 참가자가 없습니다.";
  for(const button of $("roster").querySelectorAll("button[data-id]")){
    const team=selections.get(button.dataset.id);
    button.setAttribute("aria-pressed",Boolean(team));
    button.textContent=button.dataset.name+(team?(mode==="team"?" ["+team+"]":" ✓"):"");
  }
  syncButtons();
}
function syncButtons(){
  const picks=chosen(),teams=new Set(picks.map(d=>selections.get(d.id)));
  $("start").disabled=!unlocked()||picks.length<2||(mode==="team"&&teams.size<2);
  $("pause").disabled=simBusy||world.actors.length===0||Boolean(world.result);
  $("pause").textContent=running?"일시정지":"계속";
  $("quickSimAll50Btn").disabled=!unlocked()||mode!=="solo"||picks.length!==1||picks.some(d=>d.simOnly)||eligibleRoster().length<2;
  $("quickSim100Btn").disabled=!unlocked()||mode!=="solo"||picks.length!==2||picks.some(d=>d.simOnly);
  $("fullMatrix30Btn").disabled=!unlocked()||mode!=="solo"||eligibleRoster().length<2;
  for(const id of ["soloModeBtn","teamModeBtn","clearSelectionBtn","selectAllBtn","randomBtn","bossBtn"]){
    $(id).disabled=!unlocked()||(CHARACTERS.length===0&&!["soloModeBtn","teamModeBtn"].includes(id));
  }
  for(const button of $("roster").querySelectorAll("button"))button.disabled=!unlocked();
  $("resetMatchupBtn").disabled=simBusy||history.length===0;
  $("copyMatchupBtn").disabled=history.length===0;
  $("reset").disabled=simBusy;$("cancelSimBtn").hidden=!simBusy;
  $("soloModeBtn").setAttribute("aria-pressed",mode==="solo");
  $("teamModeBtn").setAttribute("aria-pressed",mode==="team");
}
function renderRoster(){
  $("roster").replaceChildren();
  if(!CHARACTERS.length){$("roster").textContent="등록된 캐릭터가 없습니다. 캐릭터 추가 후 전투와 자동 테스트를 사용할 수 있습니다.";return;}
  for(const d of CHARACTERS.filter(d=>filter==="전체"||d.faction===filter)){
    const card=document.createElement("div");card.className="card";
    const button=document.createElement("button");button.dataset.id=d.id;button.dataset.name=d.name;
    button.onclick=()=>{if(!unlocked())return;const previous=selections.get(d.id);
      if(mode==="solo"){previous?selections.delete(d.id):selections.set(d.id,"solo");}
      else{if(!previous)selections.set(d.id,"A");else if(previous==="A")selections.set(d.id,"B");else selections.delete(d.id);}
      soundEffect();renderSelection();
    };
    const stats=document.createElement("div");stats.className="muted";stats.textContent="HP "+d.maxHp+" · 방어 "+d.armor+" · 마저 "+d.magicResist+" · "+d.element;
    card.append(button,stats);$("roster").append(card);
  }renderSelection();
}
$("filters").onclick=e=>{const value=e.target.dataset.filter;if(value){filter=value;renderRoster();}};
function setMode(next){if(!unlocked())return;mode=next;selections.clear();resetWorld();renderRoster();}
$("soloModeBtn").onclick=()=>setMode("solo");$("teamModeBtn").onclick=()=>setMode("team");
$("clearSelectionBtn").onclick=()=>{selections.clear();renderSelection();};
$("selectAllBtn").onclick=()=>{CHARACTERS.forEach((d,i)=>selections.set(d.id,mode==="team"?(i%2?"B":"A"):"solo"));renderSelection();};
function randomSelect(count){
  if(!unlocked())return;
  const list=[...CHARACTERS];for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  selections.clear();list.slice(0,count).forEach((d,i)=>selections.set(d.id,mode==="team"?(i%2?"B":"A"):"solo"));renderSelection();
}
$("randomBtn").onclick=()=>randomSelect(mode==="team"?6:5);$("bossBtn").onclick=()=>randomSelect(2);
function resetWorld(){running=false;accumulator=0;roundRecorded=false;world=createWorld([]);$("log").replaceChildren();renderStatus();syncButtons();}
$("reset").onclick=resetWorld;
$("start").onclick=()=>{
  const picks=chosen();if(picks.length<2||!unlocked())return;
  if(mode==="team"&&new Set(picks.map(d=>selections.get(d.id))).size<2){message("A팀과 B팀에 참가자를 배정하세요.");return;}
  world=createWorld(picks,{mode,teams:selections,log:addLog});canvas.width=world.width;canvas.height=world.height;
  accumulator=0;roundRecorded=false;running=true;$("log").replaceChildren();message("");soundEffect();syncButtons();
};
$("pause").onclick=()=>{if(simBusy||world.result||!world.actors.length)return;running=!running;accumulator=0;syncButtons();};
$("speed").onclick=()=>{speed=speed===1?2:speed===2?4:1;$("speed").textContent=speed+"배속";};
$("dark").onclick=()=>{light=false;};$("light").onclick=()=>{light=true;};
$("fullscreen").onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $("arenaPanel").requestFullscreen();}catch{message("전체 화면을 사용할 수 없습니다.");}};
$("soundBtn").onclick=()=>{sound=!sound;$("soundBtn").textContent=sound?"효과음 끄기":"효과음 켜기";soundEffect();};
$("volumeBtn").onclick=()=>{volume=volume===.6?.3:volume===.3?1:.6;$("volumeBtn").textContent="볼륨 "+Math.round(volume*100)+"%";soundEffect();};
$("patchNoteBtn").onclick=()=>$("patchDialog").showModal();$("patchClose").onclick=()=>$("patchDialog").close();
$("damageClose").onclick=()=>$("damageDialog").close();
function finishLive(){
  running=false;const r=world.result;
  addLog(r.draw?"무승부":mode==="team"?r.winner+"팀 승리!":r.survivors[0].name+" 승리!");
  if(!roundRecorded&&mode==="solo"&&world.actors.length===2&&!world.actors.some(a=>a.simOnly)){
    const definitions=world.actors.map(a=>CHARACTERS.find(d=>d.id===a.baseId));
    const score=createScore(...definitions);recordRound(score,r);history.push(score);save();
  }
  roundRecorded=true;syncButtons();soundEffect();
}
function renderStatus(){
  const live=world.actors.filter(a=>a.alive);
  $("status").textContent=(world.result?world.result.draw?"무승부":"전투 종료":running?"전투 중":world.actors.length?"일시정지":"전투 준비")
    +" · "+world.time.toFixed(1)+"초 · 참가/생존 "+world.actors.length+"/"+live.length+"명";
  $("actors").replaceChildren();
  for(const a of world.actors){
    const card=document.createElement("div");card.className="card";
    const title=document.createElement("button");title.textContent=a.name+(mode==="team"?" ["+a.team+"]":"")+" · HP "+Math.ceil(a.hp)+"/"+a.maxHp;
    title.onclick=()=>{$("damageTitle").textContent=a.name+" 피해량";$("damageText").textContent="준 피해 "+Math.round(a.damageDealt)+" · 받은 피해 "+Math.round(a.damageTaken);$("damageDialog").showModal();};
    const hp=document.createElement("progress");hp.className="hp";hp.max=a.maxHp;hp.value=a.hp;card.append(title,hp);
    for(const slot of SLOTS){const label=document.createElement("div");label.textContent=slot+" · "+a.cooldowns[slot].toFixed(1)+"초";
      const bar=document.createElement("progress");bar.max=1;bar.value=a.skills[slot].cooldown?1-a.cooldowns[slot]/a.skills[slot].cooldown:1;card.append(label,bar);}
    $("actors").append(card);
  }
}
$("copyMatchupBtn").onclick=async()=>{
  const text=history.map(matchupLine).join("\n");
  try{await navigator.clipboard.writeText(text);message("전적을 복사했습니다.");}
  catch{const area=document.createElement("textarea");area.value=text;$("message").replaceChildren(area);area.focus();area.select();}
};
$("resetMatchupBtn").onclick=()=>{if(simBusy)return;history=[];save();$("matrix").replaceChildren();message("누적 전적을 초기화했습니다.");syncButtons();};
function showMatrix(entries,roster){
  const table=document.createElement("table"),head=document.createElement("tr");
  for(const name of ["승-무-패",...roster.map(d=>d.name)]){const th=document.createElement("th");th.textContent=name;head.append(th);}table.append(head);
  for(const a of roster){const row=document.createElement("tr"),name=document.createElement("th");name.textContent=a.name;row.append(name);
    for(const b of roster){const cell=document.createElement("td"),s=entries.find(s=>(s.aId===a.id&&s.bId===b.id)||(s.aId===b.id&&s.bId===a.id));
      cell.textContent=a.id===b.id?"—":!s?"미완료":s.aId===a.id?s.aWins+"-"+s.drawCount+"-"+s.bWins:s.bWins+"-"+s.drawCount+"-"+s.aWins;row.append(cell);}
    table.append(row);
  }$("matrix").replaceChildren(table);
}
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
async function simulatePair(a,b,count,label){
  const score=createScore(a,b);
  for(let round=0;round<count;round++){
    const match=createWorld([a,b]);let steps=0;
    while(!match.result){
      stepWorld(match);
      if(++steps%600===0){$("simProgress").textContent=label+" · "+(round+1)+"/"+count+"전 · "+match.time.toFixed(0)+"초";await yieldUI();if(cancelSim)return null;}
    }
    if(cancelSim)return null;
    recordRound(score,match.result);
    $("simProgress").textContent=label+" · "+(round+1)+"/"+count+"전";await yieldUI();
  }return score;
}
async function runBatch(kind){
  if(!unlocked()||mode!=="solo")return;
  const roster=eligibleRoster(),picks=chosen(),pairs=[];
  if(kind==="all"){for(let i=0;i<roster.length;i++)for(let j=i+1;j<roster.length;j++)pairs.push([roster[i],roster[j]]);}
  else if(kind==="focus"){if(picks.length!==1||picks[0].simOnly)return;for(const d of roster)if(d.id!==picks[0].id)pairs.push([picks[0],d]);}
  else{if(picks.length!==2||picks.some(d=>d.simOnly))return;pairs.push(picks);}
  if(!pairs.length)return;
  simBusy=true;cancelSim=false;syncButtons();message("");const entries=[],count=kind==="pair"?100:50;
  try{
    for(let i=0;i<pairs.length;i++){
      if(cancelSim)break;
      const [a,b]=pairs[i],label=(i+1)+"/"+pairs.length+"조합 · "+a.name+" vs "+b.name;
      const score=await simulatePair(a,b,count,label);if(!score)break;
      entries.push(score);history.push(score);save();
      if(kind==="all")showMatrix(entries,roster);
    }
    message(cancelSim?"테스트를 중단했습니다. 완료된 조합의 전적은 보관됩니다.":"테스트 완료 · "+entries.length+"개 조합 · 각 "+count+"전");
  }catch(error){message("테스트 오류: "+error.message);}
  finally{simBusy=false;$("simProgress").textContent="";syncButtons();}
}
$("quickSimAll50Btn").onclick=()=>runBatch("focus");$("fullMatrix30Btn").onclick=()=>runBatch("all");
$("quickSim100Btn").onclick=()=>runBatch("pair");$("cancelSimBtn").onclick=()=>{cancelSim=true;message("현재 계산을 중단하는 중입니다.");};
let lastStatus=0;
function frame(timestamp){
  const elapsed=previous===null?0:Math.min(.1,(timestamp-previous)/1000);previous=timestamp;
  if(running&&!simBusy){accumulator+=elapsed*speed;while(accumulator>=STEP&&running){stepWorld(world);accumulator-=STEP;if(world.result)finishLive();}}
  const width=canvas.width,height=canvas.height;
  ctx.fillStyle=light?"#f8fafc":"#020617";ctx.fillRect(0,0,width,height);
  ctx.strokeStyle=light?"#e2e8f0":"#1e293b";ctx.lineWidth=1;
  for(let x=0;x<=width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(let y=0;y<=height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  for(const a of world.actors.filter(a=>a.alive)){
    ctx.fillStyle=a.color||"#60a5fa";ctx.beginPath();ctx.arc(a.x,a.y,a.radius,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=light?"#0f172a":"#f8fafc";ctx.textAlign="center";ctx.font="13px sans-serif";ctx.fillText(a.name,a.x,a.y+a.radius+16);
    ctx.fillStyle="#334155";ctx.fillRect(a.x-22,a.y-a.radius-10,44,4);ctx.fillStyle="#4ade80";ctx.fillRect(a.x-22,a.y-a.radius-10,44*a.hp/a.maxHp,4);
  }
  if(!world.actors.length){ctx.fillStyle=light?"#64748b":"#94a3b8";ctx.textAlign="center";ctx.font="16px sans-serif";ctx.fillText(CHARACTERS.length?"캐릭터를 선택하고 전투를 시작하세요":"캐릭터 등록 후 전투와 자동 테스트를 사용할 수 있습니다",width/2,height/2);}
  if(timestamp-lastStatus>100){renderStatus();lastStatus=timestamp;}
  requestAnimationFrame(frame);
}
renderRoster();renderSelection();renderHistory();syncButtons();renderStatus();requestAnimationFrame(frame);
