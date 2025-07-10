import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Switch, InputNumber, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { MortgageResult } from '../api/mortgage';
import { ResultsTable } from './ResultsTable';
import { calculateMortgage } from '../api/mortgage';

// Функция для форматирования чисел в миллионах
const formatMillions = (value: number): string => {
  const millions = value / 1000000;
  if (millions >= 10) {
    return millions % 1 === 0 ? `${Math.floor(millions)} млн` : `${millions.toFixed(1)} млн`;
  } else {
    return millions % 1 === 0 ? `${Math.floor(millions)} млн` : `${millions.toFixed(1)} млн`;
  }
};

// Функция для форматирования подписей оси X
const formatXAxisTick = (value: number): string => {
  const millions = value / 1000000;
  return `${Math.floor(millions)} млн`;
};

// Функция для расчета процента от общей суммы
const calculatePercentage = (value: number, total: number): string => {
  return `${Math.round((value / total) * 100)}%`;
};

// Функция для создания альтернативных данных с измененным ежемесячным платежом
const createAlternativeData = (
  originalData: MortgageResult[],
  rate: number, // в процентах
  initial: number,
  monthly: number,
  withInitial: boolean
): MortgageResult[] => {
  return originalData.map(item => {
    const years = item.years;
    const n = years * 12;
    const r = rate / 100 / 12;
    // principal по формуле аннуитета
    const newPrincipal = monthly * (1 - Math.pow(1 + r, -n)) / r;
    const newPropertyValue = newPrincipal + initial;
    const newTotalPayment = (withInitial ? initial : 0) + monthly * n;
    const newOverpayment = newTotalPayment - newPrincipal - (withInitial ? initial : 0);
    const newOverpaymentPercentage = newPrincipal !== 0 ? newOverpayment / newPrincipal : 0;
    return {
      ...item,
      monthly_payment: monthly,
      principal: newPrincipal,
      property_value: newPropertyValue,
      total_payment: newTotalPayment,
      overpayment: newOverpayment,
      overpayment_percentage: newOverpaymentPercentage, // теперь пересчитывается
      initial_payment: initial,
      rate: rate / 100
    };
  });
};

// Компонент для легенды
const ChartLegend: React.FC<{ withInitial: boolean }> = ({ withInitial }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginBottom: 24,
    marginTop: 8,
    fontFamily: 'var(--main-font-family) !important',
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
    background: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    border: '1px solid #e9ecef',
    padding: '10px 24px',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxShadow: '0 2px 8px 0 rgba(30, 42, 73, 0.04)'
  }}>
    {withInitial && (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 18, height: 12, background: '#a8dadc', borderRadius: 3, display: 'inline-block', border: '1px solid #b5d6e0' }} />
        Первоначальный взнос
      </span>
    )}
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 18, height: 12, background: '#457b9d', borderRadius: 3, display: 'inline-block', border: '1px solid #3a5c7d' }} />
      Сумма кредита
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 18, height: 12, background: '#e63946', borderRadius: 3, display: 'inline-block', border: '1px solid #c92a36' }} />
      Переплата по кредиту
    </span>
  </div>
);

export const ResultsChart: React.FC<{ data: MortgageResult[] }> = ({ data }) => {
  const [withInitial, setWithInitial] = useState(true);
  // Альтернативные параметры (по умолчанию — из первого элемента data)
  // Если в объекте нет поля rate, используем 0.165
  const mainInitial = data[0]?.initial_payment ?? 0;
  const mainMonthly = data[0]?.monthly_payment ?? 0;
  const mainRate = typeof (data[0] as any)?.rate === 'number' ? (data[0] as any).rate * 100 : 16.5;
  const [altRate, setAltRate] = useState(mainRate);
  const [altInitial, setAltInitial] = useState(mainInitial);
  const [altMonthly, setAltMonthly] = useState(mainMonthly);

  // Новое состояние для таблицы
  const [tableData, setTableData] = useState<MortgageResult[]>([]);
  useEffect(() => {
    if (!data.length) return;
    // Определяем диапазон лет из исходных данных
    const min_years = Math.min(...data.map(d => d.years));
    const max_years = Math.max(...data.map(d => d.years));
    // Берём параметры из первого элемента (или из текущих состояний)
    const params = {
      interest_rate: mainRate,
      monthly_payment: mainMonthly,
      initial_payment: mainInitial,
      min_years,
      max_years,
      min_initial_payment_percentage: data[0]?.min_initial_payment_percentage ?? 20,
      step: 1, // Явно указываем шаг 1 для таблицы
    };
    calculateMortgage(params).then(setTableData);
  }, [data, mainRate, mainMonthly, mainInitial]);

  if (!data.length) return null;
  
  // Создаем альтернативные данные
  const alternativeData = createAlternativeData(data, altRate, altInitial, altMonthly, withInitial);
  
  // Функция для создания данных графика
  const createChartData = (dataSource: MortgageResult[], withInitialToggle: boolean) => {
    const years = dataSource.map(d => d.years);
    const yPositions = years.map((_, index) => index); // Позиции для равномерного расположения
    const principal = dataSource.map(d => d.principal);
    const initial = dataSource.map(d => d.initial_payment);
    const overpay = dataSource.map(d => d.overpayment);
    const totalPayments = dataSource.map(d => d.total_payment);
    
    return withInitialToggle
      ? [
          ...initial.map((value, index) => {
            const total = initial[index] + principal[index];
            const actualPct = total > 0 ? (value / total) * 100 : 0; // Без округления для сравнения
            const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
            const isTooLow = actualPct < minPct;
            return {
              y: [yPositions[index]],
              x: [value],
              name: 'Первоначальный взнос',
              type: 'bar',
              orientation: 'h',
              marker: { color: isTooLow ? '#d3d3d3' : '#a8dadc' },
              text: [`${formatMillions(value)}<br><b>${Math.round(actualPct)}%</b>`], // Округление только для вывода
              textposition: 'inside',
              textfont: { size: 10, color: isTooLow ? '#aaa' : '#333' },
              insidetextanchor: 'middle',
              hoverinfo: 'skip',
              width: 0.4,
              opacity: isTooLow ? 0.7 : 1,
              customdata: [{ isTooLow }],
            };
          }),
          ...principal.map((value, index) => {
            const total = initial[index] + principal[index];
            const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
            const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
            const isTooLow = actualPct <= minPct;
            return {
              y: [yPositions[index]],
              x: [value],
              name: 'Сумма кредита',
              type: 'bar',
              orientation: 'h',
              marker: { color: isTooLow ? '#e0e0e0' : '#457b9d' },
              text: [`${formatMillions(value)}<br><b>${calculatePercentage(value, totalPayments[index])}</b>`],
              textposition: 'inside',
              textfont: { size: 10, color: isTooLow ? '#bbb' : '#fff' },
              insidetextanchor: 'middle',
              hoverinfo: 'skip',
              width: 0.4,
              opacity: isTooLow ? 0.7 : 1,
              customdata: [{ isTooLow }],
            };
          }),
          ...overpay.map((value, index) => {
            const total = initial[index] + principal[index];
            const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
            const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
            const isTooLow = actualPct <= minPct;
            return {
              y: [yPositions[index]],
              x: [value],
              name: 'Переплата по кредиту',
              type: 'bar',
              orientation: 'h',
              marker: { color: isTooLow ? '#ededed' : '#e63946' },
              text: [`${formatMillions(value)}<br><b>${calculatePercentage(value, totalPayments[index])}</b>`],
              textposition: 'inside',
              textfont: { size: 10, color: isTooLow ? '#ccc' : '#fff' },
              insidetextanchor: 'middle',
              hoverinfo: 'skip',
              width: 0.4,
              opacity: isTooLow ? 0.7 : 1,
              customdata: [{ isTooLow }],
            };
          }),
        ]
      : [
          {
            y: yPositions,
            x: principal,
            name: 'Сумма кредита',
            type: 'bar',
            orientation: 'h',
            marker: { color: '#457b9d' },
            text: principal.map((value, index) => {
              const total = principal[index] + overpay[index];
              return `${formatMillions(value)}<br><b>${calculatePercentage(value, total)}</b>`;
            }),
            textposition: 'inside',
            textfont: { size: 10, color: '#fff' },
            insidetextanchor: 'middle',
            hoverinfo: 'skip',
            width: 0.4
          },
          {
            y: yPositions,
            x: overpay,
            name: 'Переплата по кредиту',
            type: 'bar',
            orientation: 'h',
            marker: { color: '#e63946' },
            text: overpay.map((value, index) => {
              const total = principal[index] + overpay[index];
              return `${formatMillions(value)}<br><b>${calculatePercentage(value, total)}</b>`;
            }),
            textposition: 'inside',
            textfont: { size: 10, color: '#fff' },
            insidetextanchor: 'middle',
            hoverinfo: 'skip',
            width: 0.4
          }
        ];
  };

  // Функция для создания аннотаций с фиксированным отступом
  const createAnnotationsWithFixedOffset = (dataSource: MortgageResult[], withInitialToggle: boolean) => {
    const years = dataSource.map(d => d.years);
    const yPositions = years.map((_, index) => index); // Позиции для равномерного расположения
    const principal = dataSource.map(d => d.principal);
    const initial = dataSource.map(d => d.initial_payment);
    const overpay = dataSource.map(d => d.overpayment);
    const totalPayments = dataSource.map(d => d.total_payment);
    const propertyValues = dataSource.map(d => d.initial_payment + d.principal);
    
    // Фиксированный отступ 30px для всех аннотаций справа
    const fixedOffset = 30;
    
    // Аннотации справа от бара с фиксированным отступом
    const rightAnnotations = (!withInitialToggle
      ? yPositions.map((y, i) => {
          return {
            x: principal[i] + overpay[i],
            y,
            text: formatMillions(principal[i] + overpay[i]),
            showarrow: false,
            font: { size: 12, color: '#555' },
            xanchor: 'left',
            yanchor: 'middle',
            xshift: fixedOffset,
            opacity: 1
          };
        })
      : yPositions.map((y, i) => {
          const total = initial[i] + principal[i];
          const actualPct = total > 0 ? (initial[i] / total) * 100 : 0;
          const minPct = (dataSource[i] as any).min_initial_payment_percentage ?? 0;
          const isTooLow = actualPct <= minPct;
          return {
            x: initial[i] + principal[i] + overpay[i],
            y,
            text: formatMillions(initial[i] + principal[i] + overpay[i]),
            showarrow: false,
            font: { size: 12, color: isTooLow ? '#bbb' : '#555' },
            xanchor: 'left',
            yanchor: 'middle',
            xshift: fixedOffset,
            opacity: isTooLow ? 0.6 : 1
          };
        }));

    // Аннотации для скобок
    let bracketAnnotations: any[] = [];
    let bracketShapes: any[] = [];
    
    // Скобка для стоимости жилья (только если тогл включен)
    if (withInitialToggle) {
      const bracketValue = propertyValues;
      bracketAnnotations.push(...bracketValue.map((value, index) => {
        const total = initial[index] + principal[index];
        const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = actualPct <= minPct;
        return {
          x: value / 2,
          y: yPositions[index] - 0.3,
          text: `Стоимость жилья: <b>${formatMillions(value)}</b>`,
          showarrow: false,
          font: { size: 11, color: isTooLow ? '#bbb' : '#555' },
          xanchor: 'center',
          yanchor: 'bottom',
          bgcolor: 'rgba(255,255,255,0)',
          bordercolor: 'rgba(255,255,255,0)',
          borderwidth: 0,
          opacity: isTooLow ? 0.6 : 1
        };
      }));
      bracketShapes.push(...bracketValue.map((value, index) => [
        {
          type: 'line',
          x0: 0,
          x1: value,
          y0: yPositions[index] - 0.3,
          y1: yPositions[index] - 0.3,
          line: { color: '#555', width: 0.5 }
        },
        {
          type: 'line',
          x0: 0,
          x1: 0,
          y0: yPositions[index] - 0.3,
          y1: yPositions[index] - 0.2,
          line: { color: '#555', width: 0.5 }
        },
        {
          type: 'line',
          x0: value,
          x1: value,
          y0: yPositions[index] - 0.3,
          y1: yPositions[index] - 0.2,
          line: { color: '#555', width: 0.5 }
        }
      ]).flat());

      // --- Новая скобка и подпись для первоначального взноса ---
      bracketAnnotations.push(...initial.map((init, index) => {
        const total = initial[index] + principal[index];
        const percentRaw = total > 0 ? (init / total) * 100 : 0; // Без округления для сравнения
        const percent = Math.round(percentRaw); // Округление только для вывода
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = percentRaw < minPct;
        return {
          x: init / 2,
          y: yPositions[index] + 0.3,
          text: isTooLow 
            ? `Первоначальный взнос: <b>${percent}%</b>`
            : `Первоначальный взнос: <b>${percent}%</b>`,
          showarrow: false,
          font: { size: 11, color: isTooLow ? '#ff5252' : '#555' },
          xanchor: 'center',
          yanchor: 'top',
          bgcolor: 'rgba(255,255,255,0)',
          bordercolor: 'rgba(255,255,255,0)',
          borderwidth: 0,
          opacity: isTooLow ? 0.7 : 1
        };
      }));
      bracketShapes.push(...initial.map((init, index) => {
        const total = initial[index] + principal[index];
        const percent = total > 0 ? Math.round((init / total) * 100) : 0;
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = percent <= minPct;
        const baseColor = isTooLow ? '#f0f0f0' : '#555';
        const opacity = isTooLow ? 0.4 : 1;
        const shapes = [
          {
            type: 'line',
            x0: 0,
            x1: init,
            y0: yPositions[index] + 0.3,
            y1: yPositions[index] + 0.3,
            line: { color: baseColor, width: 0.5 },
            opacity
          },
          {
            type: 'line',
            x0: 0,
            x1: 0,
            y0: yPositions[index] + 0.3,
            y1: yPositions[index] + 0.2,
            line: { color: baseColor, width: 0.5 },
            opacity
          },
          {
            type: 'line',
            x0: init,
            x1: init,
            y0: yPositions[index] + 0.3,
            y1: yPositions[index] + 0.2,
            line: { color: baseColor, width: 0.5 },
            opacity
          }
        ];
        // Если isTooLow, добавляем поверх бара серый прямоугольник
        if (isTooLow) {
          // @ts-ignore: fillcolor поддерживается Plotly, но не типами TS
          shapes.push({
            type: 'rect',
            x0: 0,
            x1: init,
            y0: yPositions[index] - 0.2,
            y1: yPositions[index] + 0.2,
            // @ts-ignore
            fillcolor: 'rgba(220,220,220,0.25)',
            line: { color: 'rgba(220,220,220,0.25)', width: 0 },
            layer: 'above',
            opacity: 0.4
          });
        }
        return shapes;
      }).flat());
    }
    
    // Скобка для переплаты по кредиту (для любого положения тогла)
    const overpayPercentages = dataSource.map(d => Math.round(d.overpayment_percentage * 100));
    const overpayBracketAnnotations = overpayPercentages.map((perc, index) => {
      const isHighPercentage = perc > 50;
      // const percentageColor = isHighPercentage ? '#e63946' : '#555';
      let bracketStart, bracketEnd, annotationX;
      if (withInitialToggle) {
        bracketStart = initial[index] + principal[index];
        bracketEnd = initial[index] + principal[index] + overpay[index];
        annotationX = bracketStart + (bracketEnd - bracketStart) / 2;
        const total = initial[index] + principal[index];
        const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = actualPct <= minPct;
        return {
          x: annotationX,
          y: yPositions[index] - 0.45,
          text: `Переплата за кредит: <b>${perc}%</b>`,
          showarrow: false,
          font: { size: 11, color: isTooLow ? '#bbb' : '#555' },
          xanchor: 'center',
          yanchor: 'bottom',
          bgcolor: 'rgba(255,255,255,0)',
          bordercolor: 'rgba(255,255,255,0)',
          borderwidth: 0,
          opacity: isTooLow ? 0.6 : 1
        };
      } else {
        bracketStart = principal[index];
        bracketEnd = principal[index] + overpay[index];
        annotationX = bracketStart + (bracketEnd - bracketStart) / 2;
        return {
          x: annotationX,
          y: yPositions[index] - 0.45,
          text: `Переплата за кредит: <b>${perc}%</b>`,
          showarrow: false,
          font: { size: 11, color: '#555' },
          xanchor: 'center',
          yanchor: 'bottom',
          bgcolor: 'rgba(255,255,255,0)',
          bordercolor: 'rgba(255,255,255,0)',
          borderwidth: 0,
          opacity: 1
        };
      }
    });
    
    const overpayBracketShapes = overpayPercentages.map((perc, index) => {
      let bracketStart, bracketEnd;
      if (withInitialToggle) {
        bracketStart = initial[index] + principal[index];
        bracketEnd = initial[index] + principal[index] + overpay[index];
      } else {
        bracketStart = principal[index];
        bracketEnd = principal[index] + overpay[index];
      }
      return [
        {
          type: 'line',
          x0: bracketStart,
          x1: bracketEnd,
          y0: yPositions[index] - 0.45,
          y1: yPositions[index] - 0.45,
          line: { color: '#555', width: 0.5 }
        },
        {
          type: 'line',
          x0: bracketStart,
          x1: bracketStart,
          y0: yPositions[index] - 0.45,
          y1: yPositions[index] - 0.2,
          line: { color: '#555', width: 0.5 }
        },
        {
          type: 'line',
          x0: bracketEnd,
          x1: bracketEnd,
          y0: yPositions[index] - 0.45,
          y1: yPositions[index] - 0.2,
          line: { color: '#555', width: 0.5 }
        }
      ];
    }).flat();
    
    // --- ДОБАВЛЯЕМ АННОТАЦИИ И СТРЕЛКИ ДЛЯ ГОД-К-ГОДУ ---
    let yearDiffAnnotations: any[] = [];
    // let yearDiffShapes: any[] = [];
    for (let i = 1; i < yPositions.length; ++i) {
      // Сумма кредита
      const prevPrincipal = principal[i-1];
      const currPrincipal = principal[i];
      const diffPrincipal = currPrincipal - prevPrincipal;
      const diffPrincipalPct = prevPrincipal !== 0 ? (diffPrincipal / prevPrincipal) * 100 : 0;
      // Переплата
      const prevOverpay = overpay[i-1];
      const currOverpay = overpay[i];
      const diffOverpay = currOverpay - prevOverpay;
      const diffOverpayPct = prevOverpay !== 0 ? (diffOverpay / prevOverpay) * 100 : 0;
      // Форматируем
      const formatDiff = (v: number) => `${v >= 0 ? '+' : ''}${formatMillions(Math.abs(v))}`;
      const formatDiffPct = (v: number) => `▲<b>${Math.abs(Math.round(v))}%</b>`;
      // Позиция аннотации (между барами)
      let baseX = withInitialToggle
        ? initial[i] + principal[i] + overpay[i]
        : principal[i] + overpay[i];
      const xshift = fixedOffset + 100;
      const yMid = (yPositions[i] + yPositions[i-1]) / 2;
      // Текст аннотации
      const text = `Кредит:<br><b>${formatDiff(diffPrincipal)}</b> (${formatDiffPct(diffPrincipalPct)})<br>Переплата:<br><b>${formatDiff(diffOverpay)}</b> (${formatDiffPct(diffOverpayPct)})`;
      
      if (withInitialToggle) {
        const total = initial[i] + principal[i];
        const actualPct = total > 0 ? (initial[i] / total) * 100 : 0;
        const minPct = (dataSource[i] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = actualPct <= minPct;
        yearDiffAnnotations.push({
          x: baseX,
          y: yMid,
          text,
          showarrow: false,
          font: { size: 10, color: isTooLow ? '#bbb' : '#444' },
          xanchor: 'left',
          yanchor: 'middle',
          xshift,
          align: 'left',
          bgcolor: 'rgba(255,255,255,0.95)',
          bordercolor: '#e9ecef',
          borderwidth: 1,
          borderpad: 4,
          opacity: isTooLow ? 0.6 : 1
        });
      } else {
        yearDiffAnnotations.push({
          x: baseX,
          y: yMid,
          text,
          showarrow: false,
          font: { size: 10, color: '#444' },
          xanchor: 'left',
          yanchor: 'middle',
          xshift,
          align: 'left',
          bgcolor: 'rgba(255,255,255,0.95)',
          bordercolor: '#e9ecef',
          borderwidth: 1,
          borderpad: 4,
          opacity: 1
        });
      }
      // стрелка убрана
    }
    // --- КОНЕЦ ДОБАВЛЕНИЯ ---
    bracketAnnotations.push(...overpayBracketAnnotations);
    bracketShapes.push(...overpayBracketShapes);
    // Добавляем новые аннотации и стрелки
    bracketAnnotations.push(...yearDiffAnnotations);
    // bracketShapes.push(...yearDiffShapes);
    
    return { rightAnnotations, bracketAnnotations, bracketShapes };
  };

  // Создаем данные для обоих графиков
  const chartData1 = createChartData(data, withInitial);
  const chartData2 = createChartData(alternativeData, withInitial);
  
  // Создаем аннотации для обоих графиков с фиксированным отступом
  const annotations1 = createAnnotationsWithFixedOffset(data, withInitial);
  const annotations2 = createAnnotationsWithFixedOffset(alternativeData, withInitial);
  
  // Функция для генерации тиков и подписей оси X
  const getXAxisTicksAndLabels = (maxValue: number) => {
    // хотим не больше 10 подписей
    const maxTicks = 10;
    // округляем шаг до ближайших 500 тыс, 1 млн, 2 млн, 5 млн и т.д.
    const niceSteps = [500000, 1000000, 2000000, 5000000, 10000000];
    let step = 2000000;
    for (let s of niceSteps) {
      if (maxValue / s <= maxTicks) {
        step = s;
        break;
      }
    }
    const ticks = [];
    const labels = [];
    for (let i = 0; i <= maxValue; i += step) {
      ticks.push(i);
      labels.push(formatXAxisTick(i));
    }
    return { ticks, labels };
  };

  // Для каждого графика свои тики и подписи
  const maxValue1 = Math.max(...data.map(d => d.total_payment));
  const maxValue2 = Math.max(...alternativeData.map(d => d.total_payment));
  const { ticks: xAxisTicks1, labels: xAxisLabels1 } = getXAxisTicksAndLabels(maxValue1);
  const { ticks: xAxisTicks2, labels: xAxisLabels2 } = getXAxisTicksAndLabels(maxValue2);

  // Функция для форматирования чисел с пробелами
  const formatRub = (value: number) => value.toLocaleString('ru-RU');

  // Для левого графика: минимальный ежемесячный платеж из data
  const minMonthlyPayment1 = Math.min(...data.map(d => d.monthly_payment));
  // Для правого графика: минимальный ежемесячный платеж из alternativeData
  const minMonthlyPayment2 = Math.min(...alternativeData.map(d => d.monthly_payment));

  // Функция для форматирования разницы
  const formatDiff = (alt: number, main: number, isPercent = false) => {
    if (alt === main) return null;
    const diff = alt - main;
    const absDiff = Math.abs(diff);
    const percent = main !== 0 ? Math.round((absDiff / main) * 100) : 0;
    const sign = diff > 0 ? 'Увеличен' : 'Уменьшен';
    const color = diff > 0 ? '#2e7d32' : '#e63946';
    return (
      <div style={{ fontSize: 12, color, marginTop: 2, fontWeight: 500 }}>
        {sign} на {isPercent ? `${absDiff.toFixed(2)}%` : `${absDiff.toLocaleString('ru-RU')} руб.`}
        {isPercent ? '' : ` (${percent}%)`}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: 2000, margin: '0 auto' }}>
      <div style={{
        width: '100%',
        maxWidth: '3600px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 2px 16px 0 rgba(30, 42, 73, 0.08)',
        padding: '32px 8px',
        marginBottom: 32,
        border: '1px solid #e9ecef',
      }}>
        {/* Заголовок блока */}
        <h2 style={{ 
          margin: '0 0 24px 0', 
          color: '#1b263b', 
          fontSize: 24, 
          fontWeight: 'bold',
          fontFamily: 'var(--main-font-family) !important',
          textAlign: 'center',
        }}>
          Структура выплат в зависимости от срока кредита
        </h2>
        {/* Информационный блок */}
        {/* Тогл Учитывать первоначальный взнос */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 'bold', fontSize: 15, color: '#1b263b', marginRight: 12, fontFamily: 'var(--main-font-family) !important' }} className="mortgage-form-label">
            Учитывать первоначальный взнос
          </span>
          <Switch checked={withInitial} onChange={setWithInitial} style={{ background: withInitial ? '#415a77' : '#bfc4c9' }} />
        </div>
        {/* Форма и пояснительный блок */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 24 }}>
          {/* Форма параметров (оставить как есть) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Блок Изменить параметры для сравнения */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <div style={{
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: 8,
                padding: '20px 28px',
                display: 'inline-block',
                fontSize: 14,
                color: '#415a77',
                boxShadow: '0 1px 4px 0 rgba(30, 42, 73, 0.04)',
                width: 576,
                minWidth: 576
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: 14, marginBottom: 18, color: '#1b263b' }}>
                  <span>Изменить параметры для сравнения:</span>
                  <button
                    type="button"
                    style={{
                      marginLeft: 16,
                      padding: '4px 14px',
                      fontSize: 13,
                      borderRadius: 6,
                      border: '1px solid #bfc4c9',
                      background: '#fff',
                      color: '#1b263b',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => {
                      setAltRate(mainRate);
                      setAltInitial(mainInitial);
                      setAltMonthly(mainMonthly);
                    }}
                  >
                    Сбросить
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {[{
                    label: 'Ставка',
                    value: altRate,
                    onChange: (v: number | null) => setAltRate(v ?? mainRate),
                    min: 0.01,
                    max: 99,
                    step: 0.01,
                    main: mainRate,
                    isPercent: true,
                    formatter: (v: any) => `${v}`.replace('.', ','),
                    parser: (v: any) => Number((v || '').toString().replace(',', '.')),
                  }, {
                    label: 'Первоначальный взнос',
                    value: altInitial,
                    onChange: (v: number | null) => setAltInitial(v ?? mainInitial),
                    min: 0,
                    step: 10000,
                    main: mainInitial,
                    isPercent: false,
                    formatter: (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
                    parser: (v: any) => Number((v || '').toString().replace(/\s/g, '')),
                  }, {
                    label: 'Ежемесячный платёж',
                    value: altMonthly,
                    onChange: (v: number | null) => setAltMonthly(v ?? mainMonthly),
                    min: 1000,
                    step: 1000,
                    main: mainMonthly,
                    isPercent: false,
                    formatter: (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
                    parser: (v: any) => Number((v || '').toString().replace(/\s/g, '')),
                  }].map((field, idx) => (
                    <div key={field.label} style={{ display: 'flex', flexDirection: 'column', width: 180, minWidth: 180, marginBottom: 0, height: 85 }}>
                      <label style={{ fontSize: 12, color: '#888', marginBottom: 2, fontWeight: 400 }}>{field.label}</label>
                      <InputNumber
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={field.value}
                        onChange={field.onChange}
                        formatter={field.formatter}
                        parser={field.parser}
                        style={{ width: '100%', borderRadius: 6, fontSize: 15, border: '1px solid #bfc4c9', background: '#fff', height: 38, paddingLeft: 10 }}
                      />
                      {formatDiff(field.value, field.main, field.isPercent)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Блок с заголовками к каждому графику */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 8, color: '#1b263b', fontFamily: 'var(--main-font-family) !important' }}>
              Текущая структура выплат
            </h3>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 8, color: '#1b263b', fontFamily: 'var(--main-font-family) !important' }}>
              Структура выплат с измененными параметрами
            </h3>
          </div>
        </div>
        {/* Блок с описанием параметров к каждому графику */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 0, color: '#1b263b', fontWeight: 500, fontSize: 15, fontFamily: 'var(--main-font-family) !important' }}>
              (Платеж в год = <b>{formatRub(minMonthlyPayment1 * 12)}</b> руб.)
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 0, color: '#1b263b', fontWeight: 500, fontSize: 15, fontFamily: 'var(--main-font-family) !important' }}>
              (Платеж в год = <b>{formatRub(minMonthlyPayment2 * 12)}</b> руб.)
            </div>
          </div>
        </div>
        {/* Легенда */}
        <ChartLegend withInitial={withInitial} />
        {/* Два графика */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Plot
              divId="plot1"
              data={chartData1}
              style={{ width: '98%', margin: 0 }}
              layout={{
                barmode: 'stack',
                bargap: 0.5,
                xaxis: {
                  showticklabels: false,
                  showline: false,
                  showgrid: false,
                  title: '',
                  zeroline: false,
                  visible: false,
                },
                yaxis: { 
                  title: '', 
                  showgrid: false,
                  showline: false,
                  zeroline: false,
                  tickfont: { size: 12, color: '#555' },
                  autorange: 'reversed',
                  tickmode: 'array',
                  tickvals: data.map((_, index) => index),
                  ticktext: data.map(d => `${d.years} лет`)
                },
                height: Math.max(400, 100 * data.length),
                margin: { l: 80, r: 40, t: 40, b: 40 },
                plot_bgcolor: '#fff',
                paper_bgcolor: '#fff',
                annotations: [...annotations1.rightAnnotations, ...annotations1.bracketAnnotations],
                shapes: [...annotations1.bracketShapes],
                showlegend: false
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: [
                  'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
                  'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines',
                  'sendDataToCloud', 'toggleHover', 'resetViews', 'resetViewMapbox', 'zoomInGeo', 'zoomOutGeo',
                  'resetGeo', 'hoverClosestGeo', 'hoverClosestGl2d', 'hoverClosestPie', 'toggleHover', 'resetViewSankey',
                  'resetViewTernary', 'hoverClosestTernary', 'hoverClosestMapbox', 'zoomInMapbox', 'zoomOutMapbox',
                  'resetViewMapbox', 'hoverClosestScatter3d', 'hoverClosestMesh3d', 'resetCameraDefault3d',
                  'resetCameraLastSave3d', 'hoverClosestGl2d', 'hoverClosestPie', 'toggleHover', 'resetViews'
                ],
                toImageButtonOptions: {
                  format: 'png',
                  filename: 'текущая_структура_выплат',
                  height: 600,
                  width: 1200,
                  scale: 2
                }
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Plot
              divId="plot2"
              data={chartData2}
              style={{ width: '98%', margin: 0 }}
              layout={{
                barmode: 'stack',
                bargap: 0.5,
                xaxis: {
                  showticklabels: false,
                  showline: false,
                  showgrid: false,
                  title: '',
                  zeroline: false,
                  visible: false,
                },
                yaxis: { 
                  title: '', 
                  showgrid: false,
                  showline: false,
                  zeroline: false,
                  tickfont: { size: 12, color: '#555' },
                  autorange: 'reversed',
                  tickmode: 'array',
                  tickvals: alternativeData.map((_, index) => index),
                  ticktext: alternativeData.map(d => `${d.years} лет`)
                },
                height: Math.max(400, 100 * alternativeData.length),
                margin: { l: 80, r: 40, t: 40, b: 40 },
                plot_bgcolor: '#fff',
                paper_bgcolor: '#fff',
                annotations: [...annotations2.rightAnnotations, ...annotations2.bracketAnnotations],
                shapes: [...annotations2.bracketShapes],
                showlegend: false
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: [
                  'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
                  'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines',
                  'sendDataToCloud', 'toggleHover', 'resetViews', 'resetViewMapbox', 'zoomInGeo', 'zoomOutGeo',
                  'resetGeo', 'hoverClosestGeo', 'hoverClosestGl2d', 'hoverClosestPie', 'toggleHover', 'resetViewSankey',
                  'resetViewTernary', 'hoverClosestTernary', 'hoverClosestMapbox', 'zoomInMapbox', 'zoomOutMapbox',
                  'resetViewMapbox', 'hoverClosestScatter3d', 'hoverClosestMesh3d', 'resetCameraDefault3d',
                  'resetCameraLastSave3d', 'hoverClosestGl2d', 'hoverClosestPie', 'toggleHover', 'resetViews'
                ],
                toImageButtonOptions: {
                  format: 'png',
                  filename: 'структура_выплат_с_измененными_параметрами',
                  height: 600,
                  width: 1200,
                  scale: 2
                }
              }}
            />
          </div>
        </div>
        {/* Таблица результатов */}
        <ResultsTable data={tableData.length ? tableData : data} />
        <style>
          {`
            .ant-switch-checked {
              background: #415a77 !important;
              border-color: #415a77 !important;
            }
            .ant-switch {
              border-color: #415a77 !important;
            }
            .ant-switch-handle {
              background: none !important;
              border: none !important;
              box-shadow: none !important;
            }
            .chart-toggle-row, .chart-toggle-row * {
              font-family: var(--main-font-family) !important;
            }
          `}
        </style>
      </div>
    </div>
  );
}; 