/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Генерация вирусной карточки тренировки на Canvas.
 */

import { EXERCISES } from './data.js';
import { fn } from './utils.js';

export async function generateShareCard(historyItem) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // 1. Фон
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, 1080, 1920);

  // Легкий градиент в углу (акцентный цвет)
  const gradient = ctx.createRadialGradient(1080, 0, 0, 1080, 0, 800);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Логотип (рисуем штангу текстом или фигурами для простоты)
  ctx.fillStyle = '#CCFF00';
  ctx.fillRect(440, 200, 200, 20); // Гриф
  ctx.beginPath(); ctx.arc(440, 210, 40, 0, Math.PI * 2); ctx.fill(); // Блин левый
  ctx.beginPath(); ctx.arc(640, 210, 40, 0, Math.PI * 2); ctx.fill(); // Блин правый

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

  // 5. Статистика (Топ упражнений)
  let startY = 680;
  ctx.textAlign = 'left';
  
  // Считаем общий тоннаж
  let totalVolume = 0;
  historyItem.exercises.forEach(ex => {
    ex.sets.forEach(s => { totalVolume += s.weight * s.reps; });
  });

  // Вывод тоннажа
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px Manrope, sans-serif';
  ctx.fillText('Общий тоннаж', 100, startY);
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 100px Manrope, sans-serif';
  ctx.fillText(`${Math.round(totalVolume)} кг`, 100, startY + 100);
  
  startY += 260;

  // Список упражнений
  historyItem.exercises.slice(0, 3).forEach(exData => {
    const ex = EXERCISES[exData.id];
    if (!ex) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 44px Manrope, sans-serif';
    ctx.fillText(ex.name, 100, startY);

    const setsText = exData.sets.map(s => `${fn(s.weight)}×${s.reps}`).join(', ');
    ctx.fillStyle = '#8E8E93';
    ctx.font = '500 36px Manrope, sans-serif';
    ctx.fillText(setsText, 100, startY + 60);

    startY += 150;
  });

  // 6. Футер
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 32px Manrope, sans-serif';
  ctx.fillText('Умный трекер тренировок', 540, 1750);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('GymRise', 540, 1820);

  // 7. Конвертация в файл и шеринг
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
        // Фоллбек: скачивание
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

/* © Alexulyanovsk */
