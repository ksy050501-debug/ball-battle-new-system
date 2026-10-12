import {createActor,updateActor,trySkill,resolveCollision,SLOTS} from "./combat.js";
export const STEP = 1/60;
export const MATCH_LIMIT = 500;
export function createWorld(definitions, {mode="solo",teams=new Map(),log=()=>{},onDamage=()=>{}}={}) {
  const count=definitions.length;
  const width=Math.max(800,Math.ceil(Math.sqrt(count/2))*400),height=Math.max(600,Math.round(width*.75));
  const actors=definitions.map((def,i)=>{
    const angle=2*Math.PI*i/Math.max(1,count);
    const actor=createActor(def,i,width/2+Math.cos(angle)*width*.3,height/2+Math.sin(angle)*height*.3);
    actor.baseId=def.id;actor.team=mode==="team"?teams.get(def.id):def.id;return actor;
  });
  return {time:0,width,height,actors,mode,log,onDamage,result:null};
}
export function stepWorld(world,dt=STEP) {
  if(world.result)return;
  world.time+=dt;
  for(const actor of world.actors)updateActor(actor,dt,world);
  let alive=world.actors.filter(a=>a.alive);
  for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++)resolveCollision(alive[i],alive[j]);
  for(const actor of alive){
    if(!actor.alive)continue;
    const target=world.actors.filter(a=>a.alive&&a.team!==actor.team)
      .sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y))[0];
    for(const slot of SLOTS)if(trySkill(actor,slot,target,world))break;
  }
  alive=world.actors.filter(a=>a.alive&&a.kind!=="neutral"&&a.kind!=="summon");
  const teams=new Set(alive.map(a=>a.team));
  if(teams.size<=1 || world.time>=MATCH_LIMIT){
    const draw=teams.size!==1 || world.time>=MATCH_LIMIT&&teams.size>1;
    world.result={draw,winner:draw?null:alive[0].team,time:world.time,
      survivors:alive.map(a=>({id:a.baseId,hp:a.hp,maxHp:a.maxHp,name:a.name}))};
  }
}
