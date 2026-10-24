export const TERRAIN_CONFIG: Record<number, { name: string; icon: string; bg: string }> = {
  0: { name: 'Пустота', icon: '', bg: '#0d1117' },
  1: { name: 'Песок', icon: '', bg: '#b58941' },
  2: { name: 'Вода', icon: '🌊', bg: '#0f2744' },
  3: { name: 'Скала', icon: '⛰️', bg: '#272b38' },
};

export const OBJECT_CONFIG: Record<number, { name: string; icon: string }> = {
  0: { name: 'Пусто', icon: '' },
  1: { name: 'Обелиск', icon: '🗿' },
  2: { name: 'Стена', icon: '🧱' },
  9: { name: 'Обелиск', icon: '🗿' },
};

// Сетка 5х5 от -2 до +2 (25 клеток)
export const INITIAL_COORDS: { x: number; y: number }[] = [];
for (let y = 2; y >= -2; y--) {
  for (let x = -2; x <= 2; x++) {
    INITIAL_COORDS.push({ x, y });
  }
}

export const CONNECTION_CONFIG = {
  WARN_BLOCK_AGE_SEC: 5,
  DANGER_BLOCK_AGE_SEC: 15,
  SYNC_INTERVAL_MS: 2000,
};
