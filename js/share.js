/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Увеличен логотип, градиент перенесен вправо-вниз, тоннаж по центру, стилизованная схема тела.
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

  // 1. Темный фон
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Мягкая подсветка перенесена в ПРАВЫЙ НИЖНИЙ угол
  const gradient = ctx.createRadialGradient(1080, 1920, 0, 1080, 1920, 900);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.12)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Увеличенный логотип (160x160) по центру
  try {
    const logo = await loadImage('./icon.svg');
    ctx.drawImage(logo, 460, 160, 160, 160);
  } catch (e) {
    ctx.fillStyle = '#CCFF00';
    ctx.fillRect(460, 230, 160, 15);
    ctx.beginPath(); ctx.arc(460, 238, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(620, 238, 30, 0, Math.PI * 2); ctx.fill();
  }

  // 4. Заголовок и подзаголовки
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 84px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GymRise', 540, 410);

  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 42px Manrope, sans-serif';
  ctx.fillText(historyItem.dayTitle || 'Тренировка', 540, 480);

  const date = new Date(historyItem.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 36px Manrope, sans-serif';
  ctx.fillText(date, 540, 545);

  // 5. Общий тоннаж — строго по центру
  let startY = 680;
  ctx.textAlign = 'center';
  
  let totalVolume = 0;
  historyItem.exercises.forEach(exData => {
    const ex = EXERCISES[exData.id];
    const isDumbbell = ex?.unit.includes('гантель') || exData.id === 'back_db_row';
    exData.sets.forEach(s => { 
      totalVolume += (s.weight * (isDumbbell ? 2 : 1)) * s.reps; 
    });
  });

  ctx.fillStyle = '#8E8E93';
  ctx.font = 'bold 44px Manrope, sans-serif';
  ctx.fillText('ОБЩИЙ ТОННАЖ', 540, startY);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 130px Manrope, sans-serif';
  ctx.fillText(`${Math.round(totalVolume)} кг`, 540, startY + 120);

  // 6. Стилизованная схема тела вместо "робота"
  const hitMuscles = new Set();
  historyItem.exercises.forEach(ex => {
    const base = EXERCISES[ex.id];
    if (base) hitMuscles.add(base.muscle);
  });

  drawElegantBodyMap(ctx, hitMuscles);

  // 7. Футер
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 32px Manrope, sans-serif';
  ctx.fillText('Умный трекер тренировок', 540, 1750);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('GymRise', 540, 1820);

  // 8. Конвертация и вызов системного шаринга
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

// Отрисовка аккуратного минималистичного силуэта с мягкими формами
function drawElegantBodyMap(ctx, hitMuscles) {
  const cx = 540;
  const cy = 1290;
  const accent = '#CCFF00';
  const base = '#1C1C21';

  // Заголовок схемы
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '600 32px Manrope, sans-serif';
  ctx.fillText('Нагруженные мышцы', cx, cy - 280);

  // Голова
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(cx, cy - 210, 32, 0, Math.PI * 2);
  ctx.fill();

  // Плечи (округлые капсулы)
  ctx.fillStyle = (hitMuscles.has('Плечи (Перед/Сред)') || hitMuscles.has('Плечи (Зад)')) ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 105, cy - 135, 45, 75, 20); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 60, cy - 135, 45, 75, 20); ctx.fill();

  // Грудь / Верхняя часть торса
  ctx.fillStyle = hitMuscles.has('Грудь') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 70, cy - 140, 140, 85, 18); ctx.fill();

  // Руки (предплечья/бицепс)
  ctx.fillStyle = (hitMuscles.has('Бицепс') || hitMuscles.has('Трицепс')) ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 115, cy - 50, 38, 145, 15); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 77, cy - 50, 38, 145, 15); ctx.fill();

  // Кор
  ctx.fillStyle = hitMuscles.has('Кор') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 55, cy - 45, 110, 115, 15); ctx.fill();

  // Ягодицы / Бицепс бедра
  ctx.fillStyle = (hitMuscles.has('Бицепс бедра') || hitMuscles.has('Ягодицы')) ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 65, cy + 80, 130, 110, 18); ctx.fill();

  // Квадрицепс
  ctx.fillStyle = hitMuscles.has('Квадрицепс') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 65, cy + 200, 58, 140, 16); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 7, cy + 200, 58, 140, 16); ctx.fill();

  // Икры
  ctx.fillStyle = hitMuscles.has('Икры') ? accent : base;
  ctx.beginPath(); ctx.roundRect(cx - 60, cy + 350, 45, 85, 14); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 15, cy + 350, 45, 85, 14); ctx.fill();
}
