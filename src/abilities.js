import {applyDamage,applyCC,forceMove,hasCC} from "./combat.js";
export function enemies(actor, world) { return world.actors.filter(a=>a.alive&&a.team!==actor.team); }
export function angleTo(a,b) { return Math.atan2(b.y-a.y,b.x-a.x); }
export function visual(world, effect) {
  if(world.visuals===false)return;
  world.effects.push({...effect,created:world.time,until:world.time+(effect.duration||.4)});
}
export function hit(source,target,amount,world,element=source.element) {
  const actual=applyDamage(source,target,{amount,type:"magic",element},world.time);
  visual(world,{kind:"text",x:target.x,y:target.y,text:actual>0?"−"+Math.ceil(actual):"방어",color:element==="water"?"#7dd3fc":"#fb923c",duration:.6});
  world.onDamage?.(source,target,actual);
  return actual;
}
export function coneTargets(actor,world,range,angle,spread) {
  return enemies(actor,world).filter(target=>{
    const difference=Math.atan2(Math.sin(angleTo(actor,target)-angle),Math.cos(angleTo(actor,target)-angle));
    return Math.hypot(target.x-actor.x,target.y-actor.y)<=range+target.radius&&Math.abs(difference)<=spread/2;
  });
}
export function fireProjectile(actor,target,world,amount,color) {
  const angle=angleTo(actor,target),speed=380;
  world.projectiles.push({source:actor,x:actor.x,y:actor.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
    amount,color,radius:7,until:world.time+1.5});
}
export function updateAbilities(world,dt) {
  for(const p of world.projectiles){
    if(p.until<=world.time)continue;
    const oldX=p.x,oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;
    const dx=p.x-oldX,dy=p.y-oldY,length=dx*dx+dy*dy;
    let closest=null,best=Infinity;
    for(const target of enemies(p.source,world)){
      const t=length?Math.max(0,Math.min(1,((target.x-oldX)*dx+(target.y-oldY)*dy)/length)):0;
      if(Math.hypot(target.x-(oldX+t*dx),target.y-(oldY+t*dy))<=target.radius+p.radius&&t<best){closest=target;best=t;}
    }
    if(closest){hit(p.source,closest,p.amount,world);p.until=0;visual(world,{kind:"ring",x:closest.x,y:closest.y,radius:30,color:p.color});}
    if(p.x<0||p.x>world.width||p.y<0||p.y>world.height)p.until=0;
  }
  world.projectiles=world.projectiles.filter(p=>p.until>world.time);
  for(const burn of world.burns){
    if(!burn.target.alive){burn.remaining=0;continue;}
    if(world.time>=burn.next&&burn.remaining>0){hit(burn.source,burn.target,burn.amount,world);burn.remaining--;burn.next+=1;}
  }
  world.burns=world.burns.filter(b=>b.remaining>0);
  world.effects=world.effects.filter(e=>e.until>world.time);
}
export function addShield(actor,world,amount,duration) {
  actor.shields.push({amount,until:world.time+duration});
  visual(world,{kind:"ring",source:actor,radius:actor.radius+12,color:"#7dd3fc",duration});
}
export function pushAway(actor,target,world) {
  const angle=angleTo(actor,target);forceMove(target,Math.cos(angle)*330,Math.sin(angle)*330,.3,world.time);
}
export function flameChannel(actor,target,world) {
  const angle=angleTo(actor,target);
  actor.channel={remaining:6,next:world.time,interval:.16,until:world.time+.96,tick(source,w){
    for(const enemy of coneTargets(source,w,150,angle,Math.PI*2/3))hit(source,enemy,4,w);
    visual(w,{kind:"cone",source,angle,spread:Math.PI*2/3,radius:150,color:"#fb923c",duration:.18});
  }};
}
export function fireLeap(actor,target,world) {
  const angle=angleTo(actor,target),duration=.25;
  actor.dash={vx:Math.cos(angle)*360,vy:Math.sin(angle)*360,until:world.time+duration,onEnd(source,w){
    for(const enemy of enemies(source,w))if(Math.hypot(enemy.x-source.x,enemy.y-source.y)<=90+enemy.radius)hit(source,enemy,12,w);
    visual(w,{kind:"ring",source,radius:90,color:"#f97316",duration:.5});
  }};
  visual(world,{kind:"ring",x:actor.x,y:actor.y,radius:30,color:"#fdba74",duration:.3});
}
export function tide(actor,target,world) {
  const angle=angleTo(actor,target);
  for(const enemy of coneTargets(actor,world,230,angle,Math.PI)){
    hit(actor,enemy,25,world);applyCC(enemy,"slow",2,world.time,.4);
  }
  visual(world,{kind:"cone",source:actor,angle,spread:Math.PI,radius:230,color:"#38bdf8",duration:.65});
}
export function explosion(actor,world) {
  for(const enemy of enemies(actor,world))if(Math.hypot(enemy.x-actor.x,enemy.y-actor.y)<=160+enemy.radius){
    hit(actor,enemy,40,world);
    if(enemy.alive)world.burns.push({source:actor,target:enemy,amount:4,remaining:3,next:world.time+1});
  }
  visual(world,{kind:"ring",x:actor.x,y:actor.y,radius:160,color:"#ef4444",duration:.65});
}
