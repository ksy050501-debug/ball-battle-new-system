export const RULES = {
  elements: ["element-1", "element-2", "element-3", "element-4", "element-5"],
  favorable: 1.15, unfavorable: 0.85, neutral: 1
};
export const SLOTS = ["Q", "W", "E", "R"];
const CC = ["slow", "root", "stun", "silence"];
function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(name + " must be finite");
  return value;
}
export function elementMultiplier(attack, defense) {
  const a = RULES.elements.indexOf(attack), d = RULES.elements.indexOf(defense);
  if (a < 0 || d < 0) throw new TypeError("Unknown element");
  const offset = (d - a + 5) % 5;
  return offset === 0 ? RULES.neutral : offset <= 2 ? RULES.favorable : RULES.unfavorable;
}
export function damageAmount(target, hit) {
  finite(hit.amount, "damage");
  if (hit.amount < 0 || !["physical", "magic"].includes(hit.type)) throw new TypeError("Invalid damage");
  const resistance = hit.type === "physical" ? target.armor : target.magicResist;
  return hit.amount * 100 / (100 + Math.max(0, finite(resistance, "resistance")))
    * elementMultiplier(hit.element, target.element);
}
export function createActor(def, id, x, y) {
  if (!RULES.elements.includes(def.element)) throw new TypeError("Character requires an element");
  for (const slot of SLOTS) {
    const skill = def.skills?.[slot];
    if (!skill || !Number.isFinite(skill.cooldown) || skill.cooldown < 0
      || !Number.isFinite(skill.castTime) || skill.castTime < 0 || typeof skill.execute !== "function")
      throw new TypeError("Character requires valid QWER skills");
  }
  for (const field of ["maxHp", "speed", "armor", "magicResist"]) finite(def[field], field);
  if (def.maxHp <= 0 || def.speed < 0 || def.armor < 0 || def.magicResist < 0) throw new TypeError("Invalid stats");
  return {
    ...def, id, x, y, radius: def.radius ?? 18, hp: def.maxHp, alive: true,
    direction: Math.random() * Math.PI * 2, cc: [], immunity: new Set(),
    action: null, forced: null, cooldowns: Object.fromEntries(SLOTS.map(s => [s, 0])),
    damageDealt: 0, damageTaken: 0
  };
}
export function clearTransient(actor) {
  actor.cc = []; actor.action = null; actor.forced = null;
}
export function applyDamage(source, target, hit, now) {
  if (!target.alive || target.immunity.has("damage")) return 0;
  const actual = Math.min(target.hp, damageAmount(target, hit));
  target.hp = Math.max(0, target.hp - actual);
  target.damageTaken += actual;
  if (source && source !== target && target.kind !== "neutral") source.damageDealt += actual;
  if (target.hp === 0) { target.alive = false; clearTransient(target); }
  return actual;
}
export function hasCC(actor, type, now) {
  return actor.cc.some(e => e.type === type && e.until > now);
}
export function applyCC(actor, type, duration, now, strength = 0) {
  if (!CC.includes(type)) throw new TypeError("Unknown CC");
  finite(duration, "duration"); finite(now, "time"); finite(strength, "strength");
  if (!actor.alive || duration <= 0 || actor.immunity.has(type)) return false;
  if (type === "slow") {
    actor.cc.push({type, until: now + duration, strength: Math.max(0, Math.min(1, strength))});
  } else {
    const existing = actor.cc.find(e => e.type === type);
    if (existing) existing.until = Math.max(existing.until, now + duration);
    else actor.cc.push({type, until: now + duration});
  }
  if (type === "stun" || type === "silence"
    || (type === "root" && actor.action?.skill.movement)) actor.action = null;
  return true;
}
export function movementSpeed(actor, now) {
  const slow = actor.cc.filter(e => e.type === "slow" && e.until > now)
    .reduce((max, e) => Math.max(max, e.strength), 0);
  return actor.speed * (1 - slow);
}
export function forceMove(actor, vx, vy, duration, now) {
  finite(vx, "vx"); finite(vy, "vy"); finite(duration, "duration");
  if (!actor.alive || duration <= 0 || actor.immunity.has("displacement")) return false;
  actor.action = null;
  actor.forced = {vx, vy, until: now + duration};
  return true;
}
export function trySkill(actor, slot, target, world) {
  const skill = actor.skills[slot], now = world.time;
  if (!actor.alive || !skill || actor.action || actor.forced || actor.cooldowns[slot] > 0
    || hasCC(actor, "stun", now) || hasCC(actor, "silence", now)
    || (skill.movement && hasCC(actor, "root", now))) return false;
  if (!target?.alive || (skill.range != null
    && Math.hypot(target.x - actor.x, target.y - actor.y) > skill.range)
    || (skill.canUse && !skill.canUse(actor, target, world))) return false;
  actor.cooldowns[slot] = skill.cooldown;
  actor.action = {slot, skill, target, finish: now + skill.castTime};
  return true;
}
export function updateActor(actor, dt, world) {
  if (!actor.alive) return;
  const now = world.time;
  actor.cc = actor.cc.filter(e => e.until > now);
  for (const slot of SLOTS) actor.cooldowns[slot] = Math.max(0, actor.cooldowns[slot] - dt);
  if (actor.forced?.until <= now) actor.forced = null;
  if (actor.action && now >= actor.action.finish) {
    const action = actor.action;
    actor.action = null;
    if (action.target.alive) action.skill.execute(actor, action.target, world);
  }
  if (actor.forced) {
    actor.x += actor.forced.vx * dt; actor.y += actor.forced.vy * dt;
  } else if (!hasCC(actor, "stun", now) && !hasCC(actor, "root", now)
    && !(actor.action?.skill.stopMovement)) {
    const speed = movementSpeed(actor, now) * 60;
    actor.x += Math.cos(actor.direction) * speed * dt;
    actor.y += Math.sin(actor.direction) * speed * dt;
  }
  const r = actor.radius;
  if (actor.x < r || actor.x > world.width - r) {
    actor.x = Math.max(r, Math.min(world.width - r, actor.x));
    actor.direction = Math.PI - actor.direction;
    if (actor.forced) actor.forced.vx *= -1;
  }
  if (actor.y < r || actor.y > world.height - r) {
    actor.y = Math.max(r, Math.min(world.height - r, actor.y));
    actor.direction = -actor.direction;
    if (actor.forced) actor.forced.vy *= -1;
  }
}
export function resolveCollision(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
  const overlap = a.radius + b.radius - distance;
  if (!a.alive || !b.alive || overlap <= 0) return;
  const nx = distance > 0 ? dx / distance : 1, ny = distance > 0 ? dy / distance : 0;
  a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
  b.x += nx * overlap / 2; b.y += ny * overlap / 2;
  // Direction reflects; base speed never changes.
  for (const actor of [a, b]) {
    const vx = Math.cos(actor.direction), vy = Math.sin(actor.direction);
    const dot = vx * nx + vy * ny;
    actor.direction = Math.atan2(vy - 2 * dot * ny, vx - 2 * dot * nx);
  }
}
