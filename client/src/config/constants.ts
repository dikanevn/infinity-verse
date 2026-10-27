export const TERRAIN_CONFIG: Record<number, { name: string; icon: string; bg: string }> = {
  0: { name: 'Хаос', icon: '🌀', bg: '#06080f' },
  1: { name: 'Песок', icon: '', bg: '#b58941' },
  2: { name: 'Вода', icon: '🌊', bg: '#0f2744' },
  3: { name: 'Скала', icon: '⛰️', bg: '#272b38' },
};

export const OBJECT_CONFIG: Record<number, { name: string; icon: string }> = {
  0: { name: 'Пусто', icon: '' },
  1: { name: 'Обелиск', icon: '🗿' },
  2: { name: 'Стена', icon: '🧱' },
  3: { name: 'Звезда', icon: '⭐' },
  4: { name: 'Портал', icon: '🌀' },
  9: { name: 'Обелиск', icon: '🗿' },
};

// Текущий радиус исследованного мира: R = 3 (Сетка 7х7 от -3 до +3, 49 клеток)
export const WORLD_RADIUS = 3;

export const INITIAL_COORDS: { x: number; y: number }[] = [];
for (let y = WORLD_RADIUS; y >= -WORLD_RADIUS; y--) {
  for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x++) {
    INITIAL_COORDS.push({ x, y });
  }
}

export const CONNECTION_CONFIG = {
  WARN_BLOCK_AGE_SEC: 5,
  DANGER_BLOCK_AGE_SEC: 15,
  SYNC_INTERVAL_MS: 2000,
};
