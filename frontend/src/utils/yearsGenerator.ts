// Функция для генерации массива лет с учетом диапазона
export function generateYearsRange(minYears: number, maxYears: number): number[] {
  const range = maxYears - minYears;
  let step = 1;
  
  if (range > 13) {
    step = 3;
  } else if (range > 7) {
    step = 2;
  }
  
  const years: number[] = [];
  for (let year = minYears; year <= maxYears; year += step) {
    years.push(year);
  }
  
  // Если последний год меньше maxYears, добавить "последний год + шаг"
  if (years.length > 0 && years[years.length - 1] < maxYears) {
    years.push(years[years.length - 1] + step);
  }
  
  return years;
}

// Функция для фильтрации данных MortgageResult[] согласно новой логике
export function filterDataByYearsRange(data: any[]): any[] {
  if (!data.length) return data;
  
  const years = data.map(d => d.years);
  const minYears = Math.min(...years);
  const maxYears = Math.max(...years);
  
  const targetYears = generateYearsRange(minYears, maxYears);
  
  return data.filter(item => targetYears.includes(item.years));
} 