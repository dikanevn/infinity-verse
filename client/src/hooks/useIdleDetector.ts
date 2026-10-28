import { useState, useEffect, useRef, useCallback } from 'react';
import { CONNECTION_CONFIG } from '../config/constants';

/**
 * Хук обнаружения неактивности пользователя.
 * Отслеживает взаимодействие (клики, тапы, клавиши, колесико мыши, движение)
 * и переводит приложение в режим паузы через IDLE_TIMEOUT_MS (по умолчанию 3 минуты).
 */
export function useIdleDetector(timeoutMs = CONNECTION_CONFIG.IDLE_TIMEOUT_MS) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsIdle(false);
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    // Начальный запуск таймера
    resetTimer();

    // Троттлинг для mousemove, чтобы не напрягать поток на каждое микро-движение
    let lastMouseMove = 0;
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMove > 2000) { // раз в 2 секунды достаточно
        lastMouseMove = now;
        resetTimer();
      }
    };

    const handleAction = () => {
      resetTimer();
    };

    // Слушатели пользовательских действий (поддержка ПК, мобилок и десктопа)
    window.addEventListener('pointerdown', handleAction, { passive: true });
    window.addEventListener('touchstart', handleAction, { passive: true });
    window.addEventListener('keydown', handleAction, { passive: true });
    window.addEventListener('wheel', handleAction, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('pointerdown', handleAction);
      window.removeEventListener('touchstart', handleAction);
      window.removeEventListener('keydown', handleAction);
      window.removeEventListener('wheel', handleAction);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [resetTimer]);

  const resume = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return { isIdle, resume };
}
