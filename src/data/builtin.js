// Contenu intégré : le stage d'entraînement.

export function buildTrainingStage() {
  return {
    format: 'platfight-stage', version: 1, id: 'builtin-training', builtin: true,
    name: 'Arène d\'entraînement', author: 'PlatFight Studio', source: 'Intégré',
    zoffset: 200, localcoord: [320, 240], bgColor: '#1b2146',
    sky: ['#2a3a8f', '#c0517a'],
    palettes: [], pack: null, anims: {}, bg: [],
    ground: [{ x1: -150, y1: 0, x2: 150, y2: 90, style: 'solid', color: '#6a76a8' }],
    platforms: [{ x1: -110, x2: -40, y: -60 }, { x1: 40, x2: 110, y: -60 }, { x1: -35, x2: 35, y: -115 }],
    blast: { left: -330, right: 330, top: -320, bottom: 160 },
    camera: { left: -260, right: 260, top: -250, bottom: 90 },
    spawns: [[-75, -60], [75, -60], [-120, 0], [120, 0]],
    respawn: [0, -150],
    music: null,
  };
}
