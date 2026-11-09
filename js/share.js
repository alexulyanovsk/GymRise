/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Экспериментальный анатомический силуэт через Path2D.
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

  // 2. Градиент (в правом нижнем углу)
  const gradient = ctx.createRadialGradient(1080, 1920, 0, 1080, 1920, 1000);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Логотип
  try {
    const logo = await loadImage('./icon.svg');
    ctx.drawImage(logo, 460, 120, 160, 160);
  } catch (e) {
    ctx.fillStyle = '#CCFF00';
    ctx.fillRect(460, 210, 160, 15);
    ctx.beginPath(); ctx.arc(460, 218, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(620, 218, 30, 0, Math.PI * 2); ctx.fill();
  }

  // 4. Заголовок
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 84px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GymRise', 540, 360);

  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 42px Manrope, sans-serif';
  ctx.fillText(historyItem.dayTitle || 'Тренировка', 540, 430);

  const date = new Date(historyItem.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 36px Manrope, sans-serif';
  ctx.fillText(date, 540, 495);

  // 5. Общий тоннаж
  let startY = 620;
  let totalVolume = 0;
  historyItem.exercises.forEach(exData => {
    const ex = EXERCISES[exData.id];
    const isDumbbell = ex?.unit.includes('гантель') || exData.id === 'back_db_row';
    exData.sets.forEach(s => { 
      totalVolume += (s.weight * (isDumbbell ? 2 : 1)) * s.reps; 
    });
  });

  ctx.fillStyle = '#8E8E93';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('ОБЩИЙ ТОННАЖ', 540, startY);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 120px Manrope, sans-serif';
  ctx.fillText(`${Math.round(totalVolume)} кг`, 540, startY + 110);

  // 6. Карта мышц (Path2D)
  const hitMuscles = new Set();
  historyItem.exercises.forEach(ex => {
    const base = EXERCISES[ex.id];
    if (base) hitMuscles.add(base.muscle);
  });

  drawAnatomicalMap(ctx, hitMuscles);

  // 7. Футер
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 32px Manrope, sans-serif';
  ctx.fillText('Умный трекер тренировок', 540, 1750);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('GymRise', 540, 1820);

  // 8. Конвертация
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

// Отрисовка силуэта через Path2D
function drawAnatomicalMap(ctx, hitMuscles) {
  const cx = 540;
  const cy = 1250; 
  const accent = '#CCFF00';
  const base = '#1C1C21'; 

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.8, 1.8); // Размер человечка

  // Вспомогательная функция для отрисовки
  const drawPart = (pathStr, isHit) => {
    const p = new Path2D(pathStr);
    ctx.fillStyle = isHit ? accent : base;
    ctx.fill(p);
  };

  // 1. Голова (всегда серая)
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.arc(0, -130, 20, 0, Math.PI * 2); ctx.fill();

  // 2. Плечи (Дельты)
  const hitShoulders = hitMuscles.has('Плечи (Перед/Сред)') || hitMuscles.has('Плечи (Зад)');
  drawPart('M -30 -100 C -55 -100 -55 -70 -35 -70 L -25 -70 Z', hitShoulders); // Левое
  drawPart('M 30 -100 C 55 -100 55 -70 35 -70 L 25 -70 Z', hitShoulders);    // Правое

  // 3. Грудь / Спина (Торс)
  drawPart('M -30 -100 Q 0 -115 30 -100 L 25 -50 Q 0 -40 -25 -50 Z', hitMuscles.has('Грудь'));

  // 4. Руки (Бицепс/Трицепс)
  const hitArms = hitMuscles.has('Бицепс') || hitMuscles.has('Трицепс');
  drawPart('M -35 -65 Q -45 -30 -45 20 L -25 20 Q -25 -30 -20 -65 Z', hitArms); // Левая
  drawPart('M 35 -65 Q 45 -30 45 20 L 25 20 Q 25 -30 20 -65 Z', hitArms);    // Правая

  // 5. Пресс (Кор)
  drawPart('M -25 -45 L 25 -45 L 20 20 L -20 20 Z', hitMuscles.has('Кор'));

  // 6. Ноги (Верхняя часть)
  const hitLegs = hitMuscles.has('Квадрицепс') || hitMuscles.has('Бицепс бедра') || hitMuscles.has('Ягодицы');
  drawPart('M -25 30 Q -35 80 -30 140 L -5 140 Q -10 80 0 30 Z', hitLegs); // Левая
  drawPart('M 25 30 Q 35 80 30 140 L 5 140 Q 10 80 0 30 Z', hitLegs);    // Правая

  // 7. Икры
  const hitCalves = hitMuscles.has('Икры');
  drawPart('M -25 150 Q -30 180 -20 210 L -5 210 Q -10 180 -5 150 Z', hitCalves); // Левая
  drawPart('M 25 150 Q 30 180 20 210 L 5 210 Q 10 180 5 150 Z', hitCalves);    // Правая

  ctx.restore();

  // Подпись
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '600 32px Manrope, sans-serif';
  ctx.fillText('Нагруженные мышцы', cx, cy - 280);
}
