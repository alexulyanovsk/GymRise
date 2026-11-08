/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Исправлена карта тела, позиционирование логотипа и текста.
 */

import { EXERCISES } from './data.js';

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

export async function generateShareCard(historyItem) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // 1. Фон
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, 1080, 1920);

  const gradient = ctx.createRadialGradient(1080, 0, 0, 1080, 0, 800);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Логотип (сдвинули ниже и уменьшили)
  try {
    const logo = await loadImage('./icon.svg');
    ctx.drawImage(logo, 490, 130, 100, 100); // Уменьшили размер до 100x100
  } catch (e) {
    ctx.fillStyle = '#CCFF00';
    ctx.fillRect(490, 170, 100, 10);
    ctx.beginPath(); ctx.arc(490, 175, 20, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(590, 175, 20, 0, Math.PI * 2); ctx.fill();
  }

  // 3. Заголовок
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 80px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GymRise', 540, 320);

  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 40px Manrope, sans-serif';
  ctx.fillText(historyItem.dayTitle || 'Тренировка', 540, 390);

  const date = new Date(historyItem.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 36px Manrope, sans-serif';
  ctx.fillText(date, 540, 460);

  // 4. Общий тоннаж
  let startY = 600;
  ctx.textAlign = 'left';
  
  let totalVolume = 0;
  historyItem.exercises.forEach(exData => {
    const ex = EXERCISES[exData.id];
    const isDumbbell = ex?.unit.includes('гантель') || exData.id === 'back_db_row';
    exData.sets.forEach(s => { 
      totalVolume += (s.weight * (isDumbbell ? 2 : 1)) * s.reps; 
    });
  });

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px Manrope, sans-serif';
  ctx.fillText('Общий тоннаж', 100, startY);
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 120px Manrope, sans-serif';
  ctx.fillText(`${Math.round(totalVolume)} кг`, 100, startY + 110);

  // 5. Карта нагруженных мышц
  const hitMuscles = new Set();
  historyItem.exercises.forEach(ex => {
    const base = EXERCISES[ex.id];
    if (base) hitMuscles.add(base.muscle);
  });

  drawMuscleMap(ctx, hitMuscles);

  // 6. Футер
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 32px Manrope, sans-serif';
  ctx.fillText('Умный трекер тренировок', 540, 1750);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('GymRise', 540, 1820);

  // 7. Конвертация
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      
      const file = new File([blob], 'gymrise_workout.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Моя тренировка в GymRise' });
          resolve(true);
        } catch (e) { resolve(false); }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gymrise_workout.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve(true);
      }
    }, 'image/png');
  });
}

// Нормальная карта тела без наложений
function drawMuscleMap(ctx, hitMuscles) {
  const cx = 540;
  const cy = 1200; // Центр фигуры
  const accent = '#CCFF00';
  const base = '#1C1C21'; 

  // Заголовок карты (поднят выше)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '600 36px Manrope, sans-serif';
  ctx.fillText('Нагруженные группы', cx, cy - 300);

  // 1. Голова (всегда серая)
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.arc(cx, cy - 220, 35, 0, Math.PI * 2); ctx.fill();

  // 2. Плечи
  ctx.fillStyle = (hitMuscles.has('Плечи (Перед/Сред)') || hitMuscles.has('Плечи (Зад)')) ? accent : base;
  ctx.beginPath(); ctx.arc(cx - 90, cy - 120, 30, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 90, cy - 120, 30, 0, Math.PI * 2); ctx.fill();

  // 3. Грудь (Торс)
  ctx.fillStyle = hitMuscles.has('Грудь') ? accent : base;
  ctx.fillRect(cx - 80, cy - 140, 160, 70);

  // 4. Руки (Бицепс/Трицепс)
  ctx.fillStyle = (hitMuscles.has('Бицепс') || hitMuscles.has('Трицепс')) ? accent : base;
  ctx.fillRect(cx - 120, cy - 80, 30, 160); // Левая
  ctx.fillRect(cx + 90, cy - 80, 30, 160);  // Правая

  // 5. Кор
  ctx.fillStyle = hitMuscles.has('Кор') ? accent : base;
  ctx.fillRect(cx - 60, cy - 50, 120, 120);

  // 6. Ягодицы / Бицепс бедра (Верх ног)
  ctx.fillStyle = (hitMuscles.has('Бицепс бедра') || hitMuscles.has('Ягодицы')) ? accent : base;
  ctx.fillRect(cx - 70, cy + 90, 60, 100); // Левая
  ctx.fillRect(cx + 10, cy + 90, 60, 100); // Правая

  // 7. Квадрицепс (Низ ног)
  ctx.fillStyle = hitMuscles.has('Квадрицепс') ? accent : base;
  ctx.fillRect(cx - 70, cy + 210, 60, 120); // Левая
  ctx.fillRect(cx + 10, cy + 210, 60, 120); // Правая

  // 8. Икры
  ctx.fillStyle = hitMuscles.has('Икры') ? accent : base;
  ctx.fillRect(cx - 60, cy + 350, 40, 80); // Левая
  ctx.fillRect(cx + 20, cy + 350, 40, 80); // Правая
}
