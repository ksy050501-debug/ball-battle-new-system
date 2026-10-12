export const ELEMENTS = Object.freeze({
  water: Object.freeze({name: "물", color: "#3b82f6", strongAgainst: "fire", weakAgainst: "lightning"}),
  fire: Object.freeze({name: "불", color: "#ef4444", strongAgainst: "grass", weakAgainst: "water"}),
  grass: Object.freeze({name: "풀", color: "#22c55e", strongAgainst: "earth", weakAgainst: "fire"}),
  earth: Object.freeze({name: "땅", color: "#a16207", strongAgainst: "lightning", weakAgainst: "grass"}),
  lightning: Object.freeze({name: "번개", color: "#facc15", strongAgainst: "water", weakAgainst: "earth"})
});
export const ELEMENT_ORDER = Object.freeze(Object.keys(ELEMENTS));
export function elementName(id) {
  if (!Object.hasOwn(ELEMENTS, id)) throw new TypeError("Unknown element");
  return ELEMENTS[id].name;
}
export function elementColor(id) {
  if (!Object.hasOwn(ELEMENTS, id)) throw new TypeError("Unknown element");
  return ELEMENTS[id].color;
}
