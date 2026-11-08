/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Убран список упражнений, увеличен тоннаж за всю тренировку, большая карта мышц.
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

  // Легкий градиент в углу
  const gradient = ctx.createRadialGradient(1080, 0, 0, 1080, 0, 800);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Твой оригинальный логотип
  try {
    const logo = await loadImage('./icon.svg');
    ctx.drawImage(logo, 440, 100, 200, 200);
  } catch (e) {
    ctx.fillStyle = '#CCFF00';
    ctx.fillRect(440, 200, 200, 20);
    ctx.beginPath(); ctx.arc(440, 210, 40, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(640, 210, 40, 0, Math.PI * 2); ctx.fill();
  }

  // 3. Заголовок
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 80px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GymRise', 540, 380);

  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 40px Manrope, sans-serif';
  ctx.fillText(historyItem.dayTitle || 'Тренировка', 540, 450);

  // 4. Дата
  const date = new Date(historyItem.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 36px Manrope, sans-serif';
  ctx.fillText(date, 540, 520);

  // 5. Общий тоннаж за ВСЮ тренировку
  let startY = 680;
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

  // 6. Карта нагруженных мышц (теперь она занимает центр)
  const hitMuscles = new Set();
  historyItem.exercises.forEach(ex => {
    const base = EXERCISES[ex.id];
    if (base) hitMuscles.add(base.muscle);
  });

  drawMuscleMap(ctx, hitMuscles);

  // 7. Футер
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 32px Manrope, sans-serif';
  ctx.fillText('Умный трекер тренировок', 540, 1750);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('GymRise', 540, 1820);

  // 8. Конвертация и шеринг
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      
      const file = new File([blob], 'gymrise_workout.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Моя тренировка в GymRise',
            text: 'Смотри мой прогресс!'
          });
          resolve(true);
        } catch (e) {
          if (e.name !== 'AbortError') console.error('Share failed', e);
          resolve(false);
        }
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

// Функция отрисовки стилизованной карты тела (теперь больше и ниже)
function drawMuscleMap(ctx, hitMuscles) {
  const cx = 540; // Центр по X
  const cy = 1200; // Центр по Y (сдвинули вниз, чтобы заполнить пустоту)
  const accent = '#CCFF00';
  const base = '#1C1C21'; 

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '600 36px Manrope, sans-serif';
  ctx.fillText('Нагруженные группы', cx, cy - 250);

  // Увеличиваем масштаб карты (примерно в 1.5 раза)
  const s = 1.5; 

  // Голова
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.arc(cx, cy - 160 * s, 30 * s, 0, Math.PI * 2); ctx.fill();

  // Торс (Грудь / Кор)
  ctx.fillStyle = hitMuscles.has('Грудь') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 60 * s, cy - 90 * s, 120 * s, 40 * s, 10 * s); ctx.fill();
  
  ctx.fillStyle = hitMuscles.has('Кор') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 45 * s, cy - 40 * s, 90 * s, 60 * s, 10 * s); ctx.fill();

  // Плечи
  ctx.fillStyle = (hitMuscles.has('Плечи (Перед/Сред)') || hitMuscles.has('Плечи (Зад)')) ? accent : base;
  ctx.beginPath(); ctx.arc(cx - 75 * s, cy - 80 * s, 18 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 75 * s, cy - 80 * s, 18 * s, 0, Math.PI * 2); ctx.fill();
  
  // Руки (Бицепс/Трицепс)
  const armColor = (hitMuscles.has('Бицепс') || hitMuscles.has('Трицепс')) ? accent : base;
  ctx.fillStyle = armColor;
  ctx.beginPath(); ctx.roundRect(cx - 90 * s, cy - 60 * s, 20 * s, 60 * s, 10 * s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 70 * s, cy - 60 * s, 20 * s, 60 * s, 10 * s); ctx.fill();

  // Ноги (Квадрицепс)
  ctx.fillStyle = hitMuscles.has('Квадрицепс') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 40 * s, cy + 30 * s, 30 * s, 90 * s, 10 * s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 10 * s, cy + 30 * s, 30 * s, 90 * s, 10 * s); ctx.fill();

  // Бицепс бедра / Ягодицы
  const legColor = (hitMuscles.has('Бицепс бедра') || hitMuscles.has('Ягодицы')) ? accent : base;
  ctx.fillStyle = legColor;
  ctx.beginPath(); ctx.roundRect(cx - 40 * s, cy + 130 * s, 30 * s, 60 * s, 10 * s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 10 * s, cy + 130 * s, 30 * s, 60 * s, 10 * s); ctx.fill();

  // Икры
  ctx.fillStyle = hitMuscles.has('Икры') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 35 * s, cy + 200 * s, 20 * s, 40 * s, 10 * s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 15 * s, cy + 200 * s, 20 * s, 40 * s, 10 * s); ctx.fill();
}

/* © Alexulyanovsk */
