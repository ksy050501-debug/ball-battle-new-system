import {CHARACTERS} from "./characters.js";
import {SLOTS,createActor,updateActor,trySkill,resolveCollision} from "./combat.js";
const $ = id => document.getElementById(id);
const canvas = $("arena"), ctx = canvas.getContext("2d");
const world = {time:0,width:800,height:600,actors:[],log(message){
  const line = document.createElement("div"); line.textContent = this.time.toFixed(1) + "초 · " + message;
  $("log").prepend(line); while ($("log").children.length > 30) $("log").lastChild.remove();
}};
const selected = new Set();
let running = false, started = false, speed = 1, light = false, previous = null, accumulator = 0;
if (!CHARACTERS.length) $("roster").textContent = "등록된 캐릭터가 없습니다.";
for (const def of CHARACTERS) {
  const button = document.createElement("button"); button.textContent = def.name;
  button.onclick = () => {
    if (started) return;
    selected.has(def.id) ? selected.delete(def.id) : selected.add(def.id);
    button.setAttribute("aria-pressed", selected.has(def.id));
    $("start").disabled = selected.size < 2;
  };
  $("roster").append(button);
}
function renderStatus() {
  $("status").textContent = (started ? running ? "전투 중" : "일시정지" : "전투 준비") + " · " + world.time.toFixed(1) + "초";
  $("actors").replaceChildren();
  for (const a of world.actors) {
    const card = document.createElement("div"); card.className = "card";
    const title = document.createElement("div"); title.textContent = a.name + " · HP " + Math.ceil(a.hp) + "/" + a.maxHp;
    const hp = document.createElement("progress"); hp.className = "hp"; hp.max = a.maxHp; hp.value = a.hp;
    card.append(title,hp);
    for (const slot of SLOTS) {
      const label = document.createElement("div"); label.textContent = slot + " · " + a.cooldowns[slot].toFixed(1) + "초";
      const bar = document.createElement("progress"); bar.max = 1;
      bar.value = a.skills[slot].cooldown ? 1 - a.cooldowns[slot] / a.skills[slot].cooldown : 1;
      card.append(label,bar);
    }
    $("actors").append(card);
  }
}
$("start").onclick = () => {
  if (selected.size < 2 || started) return;
  const definitions = CHARACTERS.filter(d => selected.has(d.id));
  world.actors = definitions.map((d,i) => {
    const angle = Math.PI * 2 * i / definitions.length;
    return createActor(d,i,400 + Math.cos(angle)*220,300 + Math.sin(angle)*220);
  });
  world.time = 0; running = true; started = true; accumulator = 0;
  $("start").disabled = true; $("pause").disabled = false; $("pause").textContent = "일시정지";
};
$("pause").onclick = () => {running = !running; $("pause").textContent = running ? "일시정지" : "계속";};
$("reset").onclick = () => {
  running = started = false; accumulator = 0; world.time = 0; world.actors = [];
  $("log").replaceChildren(); $("start").disabled = selected.size < 2; $("pause").disabled = true;
  $("pause").textContent = "일시정지"; renderStatus();
};
$("speed").onclick = () => {speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $("speed").textContent = speed + "배속";};
$("dark").onclick = () => {light = false;};
$("light").onclick = () => {light = true;};
$("fullscreen").onclick = async () => {
  try {if(document.fullscreenElement) await document.exitFullscreen(); else await $("arenaPanel").requestFullscreen();}
  catch {world.log("전체 화면을 사용할 수 없습니다.");}
};
function step(dt) {
  world.time += dt;
  for (const actor of world.actors) updateActor(actor,dt,world);
  const alive = world.actors.filter(a => a.alive);
  for (let i=0;i<alive.length;i++) for(let j=i+1;j<alive.length;j++) resolveCollision(alive[i],alive[j]);
  for (const actor of alive) {
    const target = alive.filter(a => a !== actor).sort((a,b) =>
      Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y))[0];
    for (const slot of SLOTS) if(trySkill(actor,slot,target,world)) break;
  }
  if (alive.length <= 1) {
    running = false; $("pause").disabled = true;
    world.log(alive.length ? alive[0].name + " 승리!" : "무승부");
  }
}
let lastStatus = 0;
function frame(timestamp) {
  const elapsed = previous === null ? 0 : Math.min(.1,(timestamp-previous)/1000); previous = timestamp;
  if (running) {
    accumulator += elapsed * speed;
    while(accumulator >= 1/60 && running) {step(1/60); accumulator -= 1/60;}
  }
  ctx.fillStyle = light ? "#f8fafc" : "#020617"; ctx.fillRect(0,0,800,600);
  ctx.strokeStyle = light ? "#e2e8f0" : "#1e293b"; ctx.lineWidth = 1;
  for(let x=0;x<=800;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
  for(let y=0;y<=600;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(800,y);ctx.stroke();}
  for(const a of world.actors.filter(a=>a.alive)){
    ctx.fillStyle = a.color || "#60a5fa";ctx.beginPath();ctx.arc(a.x,a.y,a.radius,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = light ? "#0f172a" : "#f8fafc";ctx.textAlign="center";ctx.fillText(a.name,a.x,a.y+a.radius+16);
  }
  if(!world.actors.length){ctx.fillStyle=light?"#64748b":"#94a3b8";ctx.textAlign="center";ctx.font="16px sans-serif";ctx.fillText("캐릭터 등록 후 전투를 시작하세요",400,300);}
  if(timestamp-lastStatus>100){renderStatus();lastStatus=timestamp;}
  requestAnimationFrame(frame);
}
renderStatus();requestAnimationFrame(frame);
