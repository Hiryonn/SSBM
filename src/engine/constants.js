// Réglages globaux du gameplay (modifiables dans les options).
export const K = {
  launch: 0.042,      // vitesse d'éjection par point de knockback (px/frame)
  decay: 0.06,        // perte de vitesse d'éjection par frame
  hitstun: 0.4,       // frames d'étourdissement par point de knockback
  tumbleKB: 80,       // au-delà : éjection en vrille
  shieldMax: 50,
  ledgeTime: 300,
  respawnInvuln: 120,
  tapJump: true,
  di: 15,             // degrés max d'influence directionnelle
  gameSpeed: 1,
};

export function setConstants(obj) {
  if (!obj) return;
  for (const k of Object.keys(K)) if (obj[k] !== undefined) K[k] = obj[k];
}

// Formule de knockback façon Smash
export function knockback(percentAfter, dmg, weight, bkb, kbg) {
  const p = percentAfter, d = dmg, w = weight || 100;
  return (((p / 10 + (p * d) / 20) * (200 / (w + 100)) * 1.4 + 18) * (kbg / 100)) + bkb;
}
