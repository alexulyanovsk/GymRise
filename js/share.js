/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Надежная отрисовка SVG через Base64 без DOMParser.
 */

import { EXERCISES } from './data.js';

const MUSCLE_MAP = {
  'Грудь': ['pectorals'],
  'Спина': ['lowerback', 'trapezoidback', 'trapezoid'],
  'Плечи (Перед/Сред)': ['deltoids', 'backdeltoids'],
  'Плечи (Зад)': ['backdeltoids'],
  'Бицепс': ['biceps'],
  'Трицепс': ['triceps'],
  'Кор': ['abdomen'],
  'Квадрицепс': ['quadriceps'],
  'Бицепс бедра': ['hamstrings'],
  'Ягодицы': ['gluteus', 'abductors'],
  'Икры': ['gastrocnemius', 'tibialis', 'lowerleg']
};

async function loadAndColorSvg(svgPath, hitMuscles) {
  try {
    const response = await fetch(svgPath);
    if (!response.ok) {
      console.warn('Файл не найден:', svgPath);
      return null; 
    }
    let svgText = await response.text();

    // 1. Заменяем базовые цвета на темно-серый
    svgText = svgText.replace(/\.body-part\s*\{[^}]*\}/g, '.body-part { fill: #1C1C21 !important; }');
    svgText = svgText.replace(/\.muscle\s*\{[^}]*\}/g, '.muscle { fill: #1C1C21 !important; }');

    // 2. Собираем CSS для нагруженных мышц
    let hitCss = '';
    hitMuscles.forEach(group => {
      const ids = MUSCLE_MAP[group] || [];
      ids.forEach(id => {
        hitCss += `#${id} { fill: #CCFF00 !important; }\n`;
      });
    });

    // 3. Внедряем CSS
    if (svgText.includes('</style>')) {
      svgText = svgText.replace('</style>', `${hitCss}</style>`);
    } else {
      svgText = svgText.replace(/(<svg[^>]*>)/, `$1<style>${hitCss}</style>`);
    }

    // 4. Конвертируем в Base64 (самый надежный метод для Canvas)
    const base64Svg = btoa(unescape(encodeURIComponent(svgText)));
    const url = `data:image/svg+xml;base64,${base64Svg}`;

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => {
        console.error('Ошибка загрузки SVG', err);
        resolve(null);
      };
      img.src = url;
    });
  } catch (e) {
    console.error('Ошибка парсинга SVG:', svgPath, e);
    return null;
  }
}

export async function generateShareCard(historyItem) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // 1. Фон
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Градиент в правом нижнем углу
  const gradient = ctx.createRadialGradient(1080, 1920, 0, 1080, 1920, 1000);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Логотип
  try {
    const logo = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = './icon.svg';
    });
    ctx.drawImage(logo, 460, 120, 160, 160);
  } catch (e) {
    ctx.fillStyle = '#CCFF00';
    ctx.fillRect(460, 210, 160, 15);
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

  // 6. Загрузка и отрисовка карты мышц
  const hitMuscles = new Set();
  historyItem.exercises.forEach(ex => {
    const base = EXERCISES[ex.id];
    if (base) hitMuscles.add(base.muscle);
  });

  const [frontImg, backImg] = await Promise.all([
    loadAndColorSvg('./assets/body-front.svg', hitMuscles),
    loadAndColorSvg('./assets/body-back.svg', hitMuscles)
  ]);

  if (frontImg || backImg) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8E8E93';
    ctx.font = '600 32px Manrope, sans-serif';
    ctx.fillText('Нагруженные мышцы', 540, startY + 220);

    const imgY = startY + 260;
    const imgW = 280;
    const imgH = 500;

    if (frontImg) ctx.drawImage(frontImg, 230, imgY, imgW, imgH);
    if (backImg) ctx.drawImage(backImg, 570, imgY, imgW, imgH);
  }

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
