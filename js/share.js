/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Исправлен подсчет тоннажа (только для топ-3), группировка подходов, 
 *           единицы измерения и логотип с дырками.
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

  // Легкий градиент в углу
  const gradient = ctx.createRadialGradient(1080, 0, 0, 1080, 0, 800);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Логотип с прозрачными дырками
  ctx.fillStyle = '#CCFF00';
  // Гриф
  ctx.fillRect(440, 200, 200, 20);
  // Блины
  ctx.beginPath(); ctx.arc(440, 210, 40, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(640, 210, 40, 0, Math.PI * 2); ctx.fill();
  
  // Вырезаем дырки (destination-out)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(440, 210, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(640, 210, 14, 0, Math.PI * 2); ctx.fill();
  // Возвращаем режим рисования
  ctx.globalCompositeOperation = 'source-over';

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

  // 5. Статистика
  let startY = 700;
  ctx.textAlign = 'left';
  
  // Берем только первые 3 упражнения
  const displayExs = historyItem.exercises.slice(0, 3);
  
  // Считаем тоннаж для этих 3
  let totalVolume = 0;
  displayExs.forEach(exData => {
    const ex = EXERCISES[exData.id];
    // Проверяем, гантельное ли это упражнение
    const isDumbbell = ex?.unit.includes('гантель') || exData.id === 'back_db_row';
    
    exData.sets.forEach(s => { 
      const actualWeight = s.weight * (isDumbbell ? 2 : 1);
      totalVolume += actualWeight * s.reps; 
    });
  });

  // Вывод тоннажа
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px Manrope, sans-serif';
  ctx.fillText('Общий тоннаж', 100, startY);
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 100px Manrope, sans-serif';
  ctx.fillText(`${Math.round(totalVolume)} кг`, 100, startY + 100);
  
  startY += 320; // Чуть больше отступа

  // Список упражнений
  displayExs.forEach(exData => {
    const ex = EXERCISES[exData.id];
    if (!ex) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 48px Manrope, sans-serif';
    ctx.fillText(ex.name, 100, startY);

    // Группируем подходы
    const groups = {};
    exData.sets.forEach(s => {
      const key = `${s.weight}_${s.reps}`;
      groups[key] = (groups[key] || 0) + 1;
    });
    
    // Формируем текст: 3 × 8 (37,5 кг)
    const unitText = ex.unit.includes('гантель') ? 'кг/гантель' : 'кг';
    const setsText = Object.entries(groups)
      .map(([key, count]) => {
        const [w, r] = key.split('_');
        return `${count} × ${r} (${fn(w)} ${unitText})`;
      })
      .join('; ');

    ctx.fillStyle = '#8E8E93';
    ctx.font = '500 38px Manrope, sans-serif';
    ctx.fillText(setsText, 100, startY + 60);

    startY += 180; // Увеличили отступ между упражнениями
  });

  // 6. Футер
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 32px Manrope, sans-serif';
  ctx.fillText('Умный трекер тренировок', 540, 1750);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('GymRise', 540, 1820);

  // 7. Конвертация и шеринг
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

/* © Alexulyanovsk */
