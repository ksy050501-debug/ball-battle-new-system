import {fireProjectile,addShield,pushAway,flameChannel,fireLeap,tide,explosion,hit,visual} from "./abilities.js";
export const CHARACTERS = [
  {
    id:"water-tank",name:"물 탱커",role:"탱커",faction:"게임",element:"water",
    maxHp:240,armor:40,magicResist:35,speed:2.4,radius:22,color:"#3b82f6",
    skills:{
      Q:{name:"물방울 타격",description:"물방울을 발사해 마법 피해 12",cooldown:3,castTime:.2,range:240,execute(a,t,w){fireProjectile(a,t,w,12,"#38bdf8");}},
      W:{name:"물의 보호막",description:"보호막 30 · 4초 유지",cooldown:10,castTime:.1,
        canUse(a){return a.shields.length===0;},execute(a,t,w){addShield(a,w,30,4);}},
      E:{name:"파도 밀치기",description:"마법 피해 10 · 넉백",cooldown:8,castTime:.2,range:100,execute(a,t,w){
        hit(a,t,10,w);pushAway(a,t,w);visual(w,{kind:"ring",source:a,radius:100,color:"#7dd3fc",duration:.4});
      }},
      R:{name:"해일",description:"전방 180도 마법 피해 25 · 40% 둔화 2초",cooldown:18,castTime:.5,range:230,stopMovement:true,execute:tide}
    }
  },
  {
    id:"fire-damage",name:"불 딜러",role:"딜러",faction:"게임",element:"fire",
    maxHp:170,armor:15,magicResist:15,speed:2.9,radius:18,color:"#ef4444",
    skills:{
      Q:{name:"화염탄",description:"화염탄을 발사해 마법 피해 20",cooldown:2.5,castTime:.15,range:260,execute(a,t,w){fireProjectile(a,t,w,20,"#f97316");}},
      W:{name:"화염방사",description:"전방 120도 마법 피해 4×6회 · 시전 중 정지",cooldown:7,castTime:.2,range:150,stopMovement:true,execute:flameChannel},
      E:{name:"불꽃 도약",description:"90거리 도약 후 주변 마법 피해 12",cooldown:9,castTime:.1,range:230,movement:true,execute:fireLeap},
      R:{name:"화염 폭발",description:"주변 마법 피해 40 · 화상 4×3회",cooldown:18,castTime:.45,range:160,stopMovement:true,execute(a,t,w){explosion(a,w);}}
    }
  }
];
