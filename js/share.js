/**
 * GymRise
 * Файл: js/share.js
 * Автор и правообладатель: © Alexulyanovsk
 * Описание: Поддержка женской фигуры для карты мышц.
 */

import { EXERCISES } from './data.js';
import { femaleFront, femaleBack, FEMALE_FRONT_VIEWBOX, FEMALE_BACK_VIEWBOX } from './femaleBody.js';

const MUSCLE_MAP = {
  'Грудь': ['chest'],
  'Спина': ['upper-back', 'lower-back', 'trapezius'],
  'Плечи (Перед/Сред)': ['deltoids'],
  'Плечи (Зад)': ['deltoids'],
  'Бицепс': ['biceps'],
  'Трицепс': ['triceps'],
  'Кор': ['abs', 'obliques'],
  'Квадрицепс': ['quadriceps'],
  'Бицепс бедра': ['hamstring'],
  'Ягодицы': ['gluteal'],
  'Икры': ['calves', 'tibialis']
};

// Функция для сборки женской SVG-строки
function buildFemaleSvg(hitMuscles, isBack) {
  const paths = isBack ? femaleBack : femaleFront;
  const viewBox = isBack ? FEMALE_BACK_VIEWBOX : FEMALE_FRONT_VIEWBOX;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`;
  
  // 1. Сначала рисуем ВСЕ мышцы темно-серым
  for (const [slug, pathArr] of Object.entries(paths)) {
    for (const p of pathArr) {
      svg += `<path d="${p}" fill="#1C1C21" />`;
    }
  }

  // 2. Затем рисуем нагруженные мышцы лаймовым поверх них
  hitMuscles.forEach(group => {
    const slugs = MUSCLE_MAP[group] || [];
    slugs.forEach(slug => {
      if (paths[slug]) {
        for (const p of paths[slug]) {
          svg += `<path d="${p}" fill="#CCFF00" />`;
        }
      }
    });
  });

  svg += '</svg>';
  return svg;
}

async function loadAndColorSvg(svgPath, hitMuscles) {
  try {
    const response = await fetch(svgPath);
    if (!response.ok) return null; 
    
    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    
    doc.querySelectorAll('style').forEach(el => el.remove());
    const svgEl = doc.documentElement;
    svgEl.setAttribute('width', '277');
    svgEl.setAttribute('height', '495');

    doc.querySelectorAll('.body-part').forEach(el => {
      el.setAttribute('fill', '#1C1C21');
      el.removeAttribute('class');
      el.removeAttribute('style');
    });

    doc.querySelectorAll('.muscle').forEach(el => {
      el.setAttribute('fill', '#1C1C21');
      el.removeAttribute('class');
      el.removeAttribute('style');
      el.querySelectorAll('*').forEach(child => {
        child.setAttribute('fill', '#1C1C21');
        child.removeAttribute('style');
      });
    });

    hitMuscles.forEach(group => {
      const ids = MUSCLE_MAP[group] || [];
      ids.forEach(id => {
        const el = doc.getElementById(id);
        if (el) {
          el.setAttribute('fill', '#CCFF00');
          el.querySelectorAll('*').forEach(child => {
            child.setAttribute('fill', '#CCFF00');
          });
        }
      });
    });

    const serializer = new XMLSerializer();
    const coloredSvgStr = serializer.serializeToString(doc);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloredSvgStr)}`;

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch (e) {
    return null;
  }
}

// Конвертирует локальную SVG-строку в картинку
async function svgStringToImage(svgStr) {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateShareCard(historyItem) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, 1080, 1920);

  const gradient = ctx.createRadialGradient(1080, 1920, 0, 1080, 1920, 1000);
  gradient.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  try {
    const logo = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = './icon.svg';
    });
    ctx.drawImage(logo, 460, 120, 160, 160);
  } catch (e) {
    ctx.fillStyle = '#CCFF00';
    ctx.fillRect(460, 210, 160, 15);
  }

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

  const hitMuscles = new Set();
  historyItem.exercises.forEach(ex => {
    const base = EXERCISES[ex.id];
    if (base) hitMuscles.add(base.muscle);
  });

  let frontImg = null;
  let backImg = null;

  // Если это девушка, строим SVG локально
  if (state.profile.gender === 'female') {
    const frontSvg = buildFemaleSvg(hitMuscles, false);
    const backSvg = buildFemaleSvg(hitMuscles, true);
    frontImg = await svgStringToImage(frontSvg);
    backImg = await svgStringToImage(backSvg);
  } else {
    // Если мужчина, используем старый метод с fetch
    [frontImg, backImg] = await Promise.all([
      loadAndColorSvg('./assets/body-front.svg', hitMuscles),
      loadAndColorSvg('./assets/body-back.svg', hitMuscles)
    ]);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8E8E93';
  ctx.font = '600 32px Manrope, sans-serif';
  ctx.fillText('Нагруженные мышцы', 540, startY + 220);

  const imgY = startY + 260;
  const imgW = 280;
  const imgH = 500;

  if (frontImg && backImg) {
    ctx.drawImage(frontImg, 230, imgY, imgW, imgH);
    ctx.drawImage(backImg, 570, imgY, imgW, imgH);
  }

  ctx.fillStyle = '#8E8E93';
  ctx.font = '500 32px Manrope, sans-serif';
  ctx.fillText('Умный трекер тренировок', 540, 1750);
  
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 40px Manrope, sans-serif';
  ctx.fillText('GymRise', 540, 1820);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      
      const uniqueFileName = `gymrise_${historyItem.ts}.png`;
      const file = new File([blob], uniqueFileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Моя тренировка в GymRise' });
          resolve(true);
        } catch (e) { resolve(false); }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = uniqueFileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve(true);
      }
    }, 'image/png');
  });
}
