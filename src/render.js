export function drawFighter(ctx,a,x=a.x,y=a.y,size=a.radius||20) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);
  const water=a.element==="water";
  ctx.shadowColor=water?"#38bdf8":"#f97316";ctx.shadowBlur=7;
  ctx.fillStyle=water?"#164e63":"#7f1d1d";ctx.beginPath();ctx.moveTo(-23,22);ctx.lineTo(-19,6);ctx.lineTo(-9,0);ctx.lineTo(9,0);ctx.lineTo(19,6);ctx.lineTo(23,22);ctx.closePath();ctx.fill();
  ctx.fillStyle=water?"#38bdf8":"#f97316";
  ctx.beginPath();ctx.moveTo(-22,7);ctx.lineTo(-12,1);ctx.lineTo(-8,16);ctx.lineTo(-24,16);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(22,7);ctx.lineTo(12,1);ctx.lineTo(8,16);ctx.lineTo(24,16);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle="#fed7aa";ctx.beginPath();ctx.ellipse(0,-9,10,13,0,0,Math.PI*2);ctx.fill();
  if(water){
    ctx.fillStyle="#0c4a6e";ctx.beginPath();ctx.moveTo(-13,-6);ctx.lineTo(-12,-21);ctx.lineTo(0,-28);ctx.lineTo(12,-21);ctx.lineTo(13,-6);ctx.lineTo(7,-10);ctx.lineTo(0,-13);ctx.lineTo(-7,-10);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#bae6fd";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(0,-13);ctx.stroke();
  }else{
    ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.moveTo(-13,-13);ctx.lineTo(-15,-25);ctx.lineTo(-4,-20);ctx.lineTo(0,-32);ctx.lineTo(5,-22);ctx.lineTo(14,-29);ctx.lineTo(12,-12);ctx.lineTo(0,-19);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle="#0f172a";ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(-2,-7);ctx.lineTo(-7,-6);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(7,-9);ctx.lineTo(2,-7);ctx.lineTo(7,-6);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#9a3412";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(3,0);ctx.stroke();
  ctx.fillStyle=water?"#e0f2fe":"#fef08a";ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(5,11);ctx.lineTo(0,17);ctx.lineTo(-5,11);ctx.closePath();ctx.fill();
  ctx.restore();
}
export function drawAbilities(ctx,world){
  for(const e of world.effects){
    const x=e.source?.x??e.x,y=e.source?.y??e.y;
    const progress=Math.max(0,Math.min(1,(world.time-e.created)/(e.until-e.created)));
    ctx.save();ctx.globalAlpha=1-progress;ctx.strokeStyle=e.color;ctx.fillStyle=e.color;
    if(e.kind==="ring"){
      ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,e.radius*(e.source?.shields?.some(s=>s.until>world.time)?.95:.35+.65*progress),0,Math.PI*2);ctx.stroke();
    }else if(e.kind==="cone"){
      ctx.globalAlpha=(1-progress)*.3;ctx.beginPath();ctx.moveTo(x,y);
      ctx.arc(x,y,e.radius,e.angle-e.spread/2,e.angle+e.spread/2);ctx.closePath();ctx.fill();
      ctx.globalAlpha=1-progress;ctx.lineWidth=2;
      for(let i=0;i<5;i++){const angle=e.angle-e.spread/2+e.spread*i/4;ctx.beginPath();ctx.moveTo(x+Math.cos(angle)*25,y+Math.sin(angle)*25);ctx.lineTo(x+Math.cos(angle)*e.radius,y+Math.sin(angle)*e.radius);ctx.stroke();}
    }else if(e.kind==="text"){ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillText(e.text,x,y-28-progress*25);}
    ctx.restore();
  }
  for(const p of world.projectiles){
    ctx.save();ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(p.x-2,p.y-2,2,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  for(const b of world.burns){if(!b.target.alive)continue;ctx.save();ctx.strokeStyle="#fb923c";ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.target.x,b.target.y,b.target.radius+4,world.time*5,world.time*5+Math.PI*1.5);ctx.stroke();ctx.restore();}
}
