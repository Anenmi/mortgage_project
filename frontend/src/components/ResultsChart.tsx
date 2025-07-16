import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Switch, InputNumber, Slider, Spin } from 'antd';
import { MortgageResult } from '../api/mortgage';
import { ResultsTable } from './ResultsTable';
import axios from 'axios';
import { debounce } from 'lodash';

// Общие стили и константы
const COMMON_STYLES = {
  legend: {
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
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  legendColorBox: (color: string, borderColor: string) => ({
    width: 18,
    height: 12,
    background: color,
    borderRadius: 3,
    display: 'inline-block',
    border: `1px solid ${borderColor}`
  }),
  switch: {
    background: '#1b263b',
    minWidth: '44px',
    height: '22px'
  },
  switchInactive: {
    background: '#bfc4c9',
    minWidth: '44px',
    height: '22px'
  },
  slider: {
    rail: { backgroundColor: '#e9ecef', height: 4 },
    track: { backgroundColor: 'transparent', height: 4 },
    handle: {
      borderColor: '#1b263b',
      background: '#fff',
      borderWidth: 2,
      width: 10,
      height: 10,
      boxShadow: 'none',
      borderRadius: '50%',
      marginTop: 0
    }
  },
  bar: {
    width: 0.3,
    textfont: { size: 9 },
    insidetextanchor: 'middle',
    hoverinfo: 'skip'
  },
  plot: {
    margin: { l: 80, r: 40, t: 40, b: 40 },
    plot_bgcolor: '#fff',
    paper_bgcolor: '#fff',
    showlegend: false
  }
};

// Цвета для баров
const BAR_COLORS = {
  initial: { normal: '#a8dadc', low: '#d3d3d3', border: '#b5d6e0' },
  principal: { normal: '#457b9d', low: '#e0e0e0', border: '#3a5c7d' },
  overpayment: { normal: '#e63946', low: '#ededed', border: '#c92a36' }
};

// 2. Форматирование: оставить только нужные функции
const formatMillions = (value: number): string => `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн`;
const formatRub = (value: number) => value.toLocaleString('ru-RU');
const formatPercentage = (value: number, total: number): string => total ? `${Math.round((value / total) * 100)}%` : '0%';
const formatYears = (years: number): string => {
  if (years === 1) return '1 год';
  if (years >= 2 && years <= 4) return `${years} года`;
  return `${years} лет`;
};

// вспомогательный компонент для подписи под графиком
function YearlyPaymentLabel({ value }: { value: number }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 0, color: '#1b263b', fontWeight: 500, fontSize: 15, fontFamily: 'var(--main-font-family) !important' }}>
      Платеж в год = <b>{formatRub(value * 12)}</b> руб.
    </div>
  );
}

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

// Функция для создания альтернативных данных с измененной стоимостью жилья (для режима PropertyValue)
const createAlternativeDataForPropertyValue = (
  originalData: MortgageResult[],
  rate: number, // в процентах
  initial: number,
  propertyValue: number,
  withInitial: boolean
): MortgageResult[] => {
  return originalData.map(item => {
    const years = item.years;
    const n = years * 12;
    const r = rate / 100 / 12;
    // Рассчитываем ежемесячный платёж по формуле аннуитета из стоимости жилья
    const principal = propertyValue - initial;
    const monthlyPayment = r === 0 ? principal / n : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const newTotalPayment = (withInitial ? initial : 0) + monthlyPayment * n;
    const newOverpayment = newTotalPayment - principal - (withInitial ? initial : 0);
    const newOverpaymentPercentage = principal !== 0 ? newOverpayment / principal : 0;
    return {
      ...item,
      monthly_payment: monthlyPayment,
      principal: principal,
      property_value: propertyValue,
      total_payment: newTotalPayment,
      overpayment: newOverpayment,
      overpayment_percentage: newOverpaymentPercentage,
      initial_payment: initial,
      rate: rate / 100
    };
  });
};

// Функция для создания базового бара
const createBar = (y: number[], x: number[], name: string, color: string, text: string[], textColor: string = '#fff', opacity: number = 1) => ({
  y,
  x,
  name,
  type: 'bar' as const,
  orientation: 'h' as const,
  marker: { color },
  text,
  textposition: 'inside' as const,
  textfont: { size: COMMON_STYLES.bar.textfont.size, color: textColor },
  insidetextanchor: COMMON_STYLES.bar.insidetextanchor,
  hoverinfo: COMMON_STYLES.bar.hoverinfo,
  width: COMMON_STYLES.bar.width,
  opacity
});

// Компонент для легенды
const ChartLegend: React.FC<{ withInitial: boolean }> = ({ withInitial }) => (
  <div style={COMMON_STYLES.legend}>
    {withInitial && (
      <span style={COMMON_STYLES.legendItem}>
        <span style={COMMON_STYLES.legendColorBox(BAR_COLORS.initial.normal, BAR_COLORS.initial.border)} />
        Первоначальный взнос
      </span>
    )}
    <span style={COMMON_STYLES.legendItem}>
      <span style={COMMON_STYLES.legendColorBox(BAR_COLORS.principal.normal, BAR_COLORS.principal.border)} />
      Сумма кредита
    </span>
    <span style={COMMON_STYLES.legendItem}>
      <span style={COMMON_STYLES.legendColorBox(BAR_COLORS.overpayment.normal, BAR_COLORS.overpayment.border)} />
      Переплата по кредиту
    </span>
  </div>
);

// Легенда для аннуитетного графика
const AnnuityLegend: React.FC = () => (
  <div style={COMMON_STYLES.legend}>
    <span style={COMMON_STYLES.legendItem}>
      <span style={COMMON_STYLES.legendColorBox(BAR_COLORS.overpayment.normal, BAR_COLORS.overpayment.border)} />
      Проценты
    </span>
    <span style={COMMON_STYLES.legendItem}>
      <span style={COMMON_STYLES.legendColorBox(BAR_COLORS.principal.normal, BAR_COLORS.principal.border)} />
      Тело кредита
    </span>
  </div>
);

// Новый компонент для блока сравнения
const CompareParamsBlock: React.FC<{
  altRate: number;
  altInitial: number;
  altMonthly: number;
  setAltRate: (v: number) => void;
  setAltInitial: (v: number) => void;
  setAltMonthly: (v: number) => void;
  mainRate: number;
  mainInitial: number;
  mainMonthly: number;
  isPropertyValueMode?: boolean;
  altPropertyValue?: number;
  setAltPropertyValue?: (v: number) => void;
  mainPropertyValue?: number;
}> = ({ altRate, altInitial, altMonthly, setAltRate, setAltInitial, setAltMonthly, mainRate, mainInitial, mainMonthly, isPropertyValueMode, altPropertyValue, setAltPropertyValue, mainPropertyValue }) => (
  <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8, padding: '20px 28px', display: 'inline-block', fontSize: 14, color: '#1b263b', boxShadow: '0 1px 4px 0 rgba(30, 42, 73, 0.04)', width: 576, minWidth: 576, marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: 14, marginBottom: 18, color: '#1b263b' }}>
      <span>Изменить параметры для сравнения:</span>
      <button
        type="button"
        style={{ marginLeft: 16, padding: '4px 14px', fontSize: 13, borderRadius: 6, border: '1px solid #bfc4c9', background: '#fff', color: '#1b263b', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}
        onClick={() => {
          setAltRate(mainRate);
          setAltInitial(mainInitial);
          setAltMonthly(mainMonthly);
          if (isPropertyValueMode && setAltPropertyValue && mainPropertyValue !== undefined) setAltPropertyValue(mainPropertyValue);
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
      },
      isPropertyValueMode ? {
        label: 'Стоимость жилья',
        value: altPropertyValue ?? 0,
        onChange: (v: number | null) => setAltPropertyValue ? setAltPropertyValue(v ?? (mainPropertyValue ?? 0)) : undefined,
        min: 0,
        step: 10000,
        main: mainPropertyValue ?? 0,
        isPercent: false,
        formatter: (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        parser: (v: any) => Number((v || '').toString().replace(/\s/g, '')),
      } : {
        label: 'Ежемесячный платёж',
        value: altMonthly,
        onChange: (v: number | null) => setAltMonthly(v ?? mainMonthly),
        min: 1000,
        step: 1000,
        main: mainMonthly,
        isPercent: false,
        formatter: (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        parser: (v: any) => Number((v || '').toString().replace(/\s/g, '')),
      }
      ].map((field, idx) => {
        if (!field) return null;
        const diff = (field.value !== undefined && field.main !== undefined) ? field.value - field.main : 0;
        let diffText = null;
        if (diff !== 0) {
          const isIncrease = diff > 0;
          const sign = isIncrease ? 'увеличен' : 'уменьшен';
          const color = isIncrease ? '#2e7d32' : '#e63946';
          if (field.isPercent) {
            diffText = (
              <div style={{ fontSize: 12, color, fontWeight: 500, marginTop: 2 }}>
                {field.label} {sign} на {Math.abs(diff).toLocaleString('ru-RU').replace('.', ',')}%
              </div>
            );
          } else {
            diffText = (
              <div style={{ fontSize: 12, color, fontWeight: 500, marginTop: 2 }}>
                {field.label} {sign} на {Math.abs(diff).toLocaleString('ru-RU')} руб.
              </div>
            );
          }
        }
        return (
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
            {diffText}
          </div>
        );
      })}
    </div>
  </div>
);

export const ResultsChart: React.FC<{ data: MortgageResult[], mainRate: number, hideYearlyPaymentInfo?: boolean, isPropertyValueMode?: boolean, altPropertyValue?: number, setAltPropertyValue?: (v: number) => void, mainPropertyValue?: number }> = ({ data, mainRate, hideYearlyPaymentInfo, isPropertyValueMode, altPropertyValue, setAltPropertyValue, mainPropertyValue }) => {
  const [withInitial, setWithInitial] = useState(true);
  // Альтернативные параметры (по умолчанию — из первого элемента data)
  const mainInitial = data[0]?.initial_payment ?? 0;
  const mainMonthly = data[0]?.monthly_payment ?? 0;
  const mainPropValue = data[0]?.property_value ?? 0;
  // --- useState с localStorage для альтернативных параметров ---
  const [altRate, setAltRate] = useState(() => {
    const saved = localStorage.getItem('altRate');
    return saved !== null ? Number(saved) : mainRate;
  });
  const [altInitial, setAltInitial] = useState(() => {
    const saved = localStorage.getItem('altInitial');
    return saved !== null ? Number(saved) : mainInitial;
  });
  const [altMonthly, setAltMonthly] = useState(() => {
    const saved = localStorage.getItem('altMonthly');
    return saved !== null ? Number(saved) : mainMonthly;
  });
  const [altPropValue, setAltPropValue] = useState(() => {
    const saved = localStorage.getItem('altPropValue');
    return saved !== null ? Number(saved) : mainPropValue;
  });
  // --- Сохранять в localStorage при изменении ---
  useEffect(() => { localStorage.setItem('altRate', String(altRate)); }, [altRate]);
  useEffect(() => { localStorage.setItem('altInitial', String(altInitial)); }, [altInitial]);
  useEffect(() => { localStorage.setItem('altMonthly', String(altMonthly)); }, [altMonthly]);
  useEffect(() => { localStorage.setItem('altPropValue', String(altPropValue)); }, [altPropValue]);

  // Сброс альтернативных параметров при изменении основных
  useEffect(() => {
    setAltRate(mainRate);
    setAltInitial(mainInitial);
    setAltMonthly(mainMonthly);
    setAltPropValue(mainPropValue);
  }, [mainRate, mainInitial, mainMonthly, mainPropValue]);

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
      step: 1
    };
    // calculateMortgage(params).then(setTableData); // This line was removed as per the edit hint
  }, [data, mainRate, mainMonthly, mainInitial]);

  // Для аннуитетного графика
  const minYears = Math.min(...data.map(d => d.years));
  const maxYears = Math.max(...data.map(d => d.years));
  const [annuityYears, setAnnuityYears] = useState(minYears);
  // Для плавного UX: отдельное состояние для handle
  const [sliderValue, setSliderValue] = useState(minYears);
  // Дебаунс для плавного обновления срока
  const debouncedSetAnnuityYears = React.useMemo(
    () => debounce((value: number) => setAnnuityYears(value), 500),
    []
  );
  useEffect(() => {
    setSliderValue(annuityYears);
  }, [annuityYears]);
  const [annuityLoading, setAnnuityLoading] = useState(false);
  const [annuityPlotData, setAnnuityPlotData] = useState<any[] | null>(null);
  const [annuityPlotLayout, setAnnuityPlotLayout] = useState<any | null>(null);
  const [annuityMode, setAnnuityMode] = useState<'months' | 'years'>('years');

  useEffect(() => {
    setAnnuityYears(minYears);
  }, [minYears, data]);

  // Параметры для запроса
  const mainParams: any = {};
  mainParams.interest_rate = mainRate;
  mainParams.initial_payment = mainInitial;
  mainParams.min_initial_payment_percentage = data[0]?.min_initial_payment_percentage ?? 20;
  if (annuityMode === 'months') {
    mainParams.months = annuityYears * 12;
  } else {
    mainParams.years = annuityYears;
  }
  if (isPropertyValueMode) {
    mainParams.property_value = mainPropertyValue;
  } else {
    mainParams.monthly_payment = mainMonthly;
  }
  const mainMode = isPropertyValueMode ? 'property_value' : 'monthly_payment';

  useEffect(() => {
    if (!data.length) return;
    setAnnuityLoading(true);
    console.log('mainParams for annuity:', { ...mainParams, mode: mainMode, mode2: annuityMode });
    axios.post('http://localhost:5000/api/annuity_payments', { ...mainParams, mode: mainMode, mode2: annuityMode })
      .then((res) => {
        setAnnuityPlotData(res.data.data);
        setAnnuityPlotLayout(res.data.layout);
      })
      .finally(() => setAnnuityLoading(false));
  }, [annuityYears, mainMonthly, mainInitial, mainRate, annuityMode, data]);

  // --- Новый аннуитетный график с изменёнными параметрами ---
  const [altAnnuityPlotData, setAltAnnuityPlotData] = useState<any[] | null>(null);
  const [altAnnuityPlotLayout, setAltAnnuityPlotLayout] = useState<any | null>(null);
  const [altAnnuityLoading, setAltAnnuityLoading] = useState(false);
  useEffect(() => {
    if (!data.length) return;
    setAltAnnuityLoading(true);
    const altParams: any = {};
    altParams.interest_rate = altRate;
    altParams.initial_payment = altInitial;
    altParams.min_initial_payment_percentage = data[0]?.min_initial_payment_percentage ?? 20;
    if (annuityMode === 'months') {
      altParams.months = annuityYears * 12;
    } else {
      altParams.years = annuityYears;
    }
    if (isPropertyValueMode) {
      altParams.property_value = altPropValue;
    } else {
      altParams.monthly_payment = altMonthly;
    }
    const debugAltParams = { ...altParams, mode: isPropertyValueMode ? 'property_value' : 'monthly_payment', mode2: annuityMode };
    console.log('altParams for annuity:', debugAltParams);
    axios.post('http://localhost:5000/api/annuity_payments', {
      ...altParams,
      mode: isPropertyValueMode ? 'property_value' : 'monthly_payment',
      mode2: annuityMode
    })
      .then((res) => {
        setAltAnnuityPlotData(res.data.data);
        setAltAnnuityPlotLayout(res.data.layout);
      })
      .finally(() => setAltAnnuityLoading(false));
  }, [altRate, altInitial, altMonthly, annuityYears, annuityMode, data]);

  if (!data.length) return null;
  
  // Создаем альтернативные данные
  const alternativeData = isPropertyValueMode 
    ? createAlternativeDataForPropertyValue(data, altRate, altInitial, altPropValue, withInitial)
    : createAlternativeData(data, altRate, altInitial, altMonthly, withInitial);
  
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
            return createBar(
              [yPositions[index]],
              [value],
              'Первоначальный взнос',
              isTooLow ? BAR_COLORS.initial.low : BAR_COLORS.initial.normal,
              [`${formatMillions(value)}<br><i>${Math.round(actualPct)}%</i>`],
              isTooLow ? '#aaa' : '#333',
              isTooLow ? 0.7 : 1
            );
          }),
          ...principal.map((value, index) => {
            const total = initial[index] + principal[index];
            const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
            const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
            const isTooLow = actualPct <= minPct;
            return createBar(
              [yPositions[index]],
              [value],
              'Сумма кредита',
              isTooLow ? BAR_COLORS.principal.low : BAR_COLORS.principal.normal,
              [`${formatMillions(value)}<br><i>${formatPercentage(value, totalPayments[index])}</i>`],
              isTooLow ? '#bbb' : '#fff',
              isTooLow ? 0.7 : 1
            );
          }),
          ...overpay.map((value, index) => {
            const total = initial[index] + principal[index];
            const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
            const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
            const isTooLow = actualPct <= minPct;
            return createBar(
              [yPositions[index]],
              [value],
              'Переплата по кредиту',
              isTooLow ? BAR_COLORS.overpayment.low : BAR_COLORS.overpayment.normal,
              [`${formatMillions(value)}<br><i>${formatPercentage(value, totalPayments[index])}</i>`],
              isTooLow ? '#ccc' : '#fff',
              isTooLow ? 0.7 : 1
            );
          }),
        ]
      : [
          createBar(
            yPositions,
            principal,
            'Сумма кредита',
            BAR_COLORS.principal.normal,
            principal.map((value, index) => {
              const total = principal[index] + overpay[index];
              return `${formatMillions(value)}<br><i>${formatPercentage(value, total)}</i>`;
            }),
            '#fff',
            1
          ),
          createBar(
            yPositions,
            overpay,
            'Переплата по кредиту',
            BAR_COLORS.overpayment.normal,
            overpay.map((value, index) => {
              const total = principal[index] + overpay[index];
              return `${formatMillions(value)}<br><i>${formatPercentage(value, total)}</i>`;
            }),
            '#fff',
            1
          )
        ];
  };

  // Функция для создания аннотаций с фиксированным отступом
  const createAnnotationsWithFixedOffset = (dataSource: MortgageResult[], withInitialToggle: boolean, isPropertyValueMode: boolean) => {
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
          const baseText = formatMillions(principal[i] + overpay[i]);
          // Показываем аннотацию только если НЕ PropertyValueMode (т.е. только в MonthlyPaymentMode)
          const monthlyText = !isPropertyValueMode 
            ? ` | Ежемесячный платеж: <span style="color:rgb(17, 27, 53); font-weight: bold; background-color: #fbf398; padding: 1px 3px; border-radius: 2px;">${Math.round(dataSource[i].monthly_payment).toLocaleString('ru-RU')}</span> руб.`
            : '';
          return {
            x: principal[i] + overpay[i],
            y,
            text: baseText + monthlyText,
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
          const baseText = formatMillions(initial[i] + principal[i] + overpay[i]);
          // Показываем аннотацию только если НЕ PropertyValueMode (т.е. только в MonthlyPaymentMode)
          const monthlyText = !isPropertyValueMode 
            ? ` | Ежемесячный платеж: <span style="color:rgb(31, 66, 104); font-weight: bold; background-color: #fbf398; padding: 1px 3px; border-radius: 2px;">${Math.round(dataSource[i].monthly_payment).toLocaleString('ru-RU')}</span> руб.`
            : '';
          return {
            x: initial[i] + principal[i] + overpay[i],
            y,
            text: baseText + monthlyText,
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
          y: yPositions[index] - 0.2,
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
      bracketShapes.push(...bracketValue.map((value, index) => {
        const total = initial[index] + principal[index];
        const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = actualPct <= minPct;
        const bracketColor = isTooLow ? '#bbb' : '#555';
        return [
        {
          type: 'line',
          x0: 0,
          x1: value,
            y0: yPositions[index] - 0.2,
            y1: yPositions[index] - 0.2,
            line: { color: bracketColor, width: 0.5 }
        },
        {
          type: 'line',
          x0: 0,
          x1: 0,
            y0: yPositions[index] - 0.2,
            y1: yPositions[index] - 0.15,
            line: { color: bracketColor, width: 0.5 }
        },
        {
          type: 'line',
          x0: value,
          x1: value,
            y0: yPositions[index] - 0.2,
            y1: yPositions[index] - 0.15,
            line: { color: bracketColor, width: 0.5 }
        }
        ];
      }).flat());

      // --- Новая скобка и подпись для первоначального взноса ---
      bracketAnnotations.push(...initial.map((init, index) => {
        const total = initial[index] + principal[index];
        const percentRaw = total > 0 ? (init / total) * 100 : 0; // Без округления для сравнения
        const percent = Math.round(percentRaw); // Округление только для вывода
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = percentRaw < minPct;
        return {
          x: init / 2,
          y: yPositions[index] + 0.25,
          text: isTooLow 
            ? `Первоначальный взнос: <b>${percent}%</b> (недостаточно)`
            : `Первоначальный взнос: <b>${percent}%</b>`,
          showarrow: false,
          font: { size: 11, color: isTooLow ? '#ff5252' : '#555' },
          xanchor: 'left',
          yanchor: 'top',
          bgcolor: 'rgba(255,255,255,0)',
          bordercolor: 'rgba(255,255,255,0)',
          borderwidth: 0,
          opacity: isTooLow ? 0.7 : 1
        };
      }));
      bracketShapes.push(...initial.map((init, index) => {
        const total = initial[index] + principal[index];
        const percentRaw = total > 0 ? (init / total) * 100 : 0;
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        const isTooLow = percentRaw < minPct;
        const percent = Math.round(percentRaw); // Округление только для вывода
        const baseColor = isTooLow ? '#f0f0f0' : '#555';
        const opacity = isTooLow ? 0.4 : 1;
        const shapes = [
          {
            type: 'line',
            x0: 0,
            x1: init,
            y0: yPositions[index] + 0.25,
            y1: yPositions[index] + 0.25,
            line: { color: baseColor, width: 0.5 },
            opacity
          },
          {
            type: 'line',
            x0: 0,
            x1: 0,
            y0: yPositions[index] + 0.25,
            y1: yPositions[index] + 0.15,
            line: { color: baseColor, width: 0.5 },
            opacity
          },
          {
            type: 'line',
            x0: init,
            x1: init,
            y0: yPositions[index] + 0.25,
            y1: yPositions[index] + 0.15,
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
          y: yPositions[index] - 0.3,
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
          y: yPositions[index] - 0.3,
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
      let isTooLow = false;
      if (withInitialToggle) {
        bracketStart = initial[index] + principal[index];
        bracketEnd = initial[index] + principal[index] + overpay[index];
        const total = initial[index] + principal[index];
        const actualPct = total > 0 ? (initial[index] / total) * 100 : 0;
        const minPct = (dataSource[index] as any).min_initial_payment_percentage ?? 0;
        isTooLow = actualPct <= minPct;
      } else {
        bracketStart = principal[index];
        bracketEnd = principal[index] + overpay[index];
      }
      const bracketColor = isTooLow ? '#bbb' : '#555';
      return [
        {
          type: 'line',
          x0: bracketStart,
          x1: bracketEnd,
          y0: yPositions[index] - 0.3,
          y1: yPositions[index] - 0.3,
          line: { color: bracketColor, width: 0.5 }
        },
        {
          type: 'line',
          x0: bracketStart,
          x1: bracketStart,
          y0: yPositions[index] - 0.3,
          y1: yPositions[index] - 0.15,
          line: { color: bracketColor, width: 0.5 }
        },
        {
          type: 'line',
          x0: bracketEnd,
          x1: bracketEnd,
          y0: yPositions[index] - 0.3,
          y1: yPositions[index] - 0.15,
          line: { color: bracketColor, width: 0.5 }
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
  
  // Создаем массивы общих платежей для hover данных
  const totalPayments1 = withInitial 
    ? data.map(d => d.total_payment)
    : data.map(d => d.principal + d.overpayment);
  const totalPayments2 = withInitial 
    ? alternativeData.map(d => d.total_payment)
    : alternativeData.map(d => d.principal + d.overpayment);
  
  // Создаем аннотации для обоих графиков с фиксированным отступом
  const annotations1 = createAnnotationsWithFixedOffset(data, withInitial, !!isPropertyValueMode);
  const annotations2 = createAnnotationsWithFixedOffset(alternativeData, withInitial, !!isPropertyValueMode);
  
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
      labels.push(formatMillions(i));
    }
    return { ticks, labels };
  };

  // Для каждого графика свои тики и подписи
  const maxValue1 = Math.max(...data.map(d => d.total_payment));
  const maxValue2 = Math.max(...alternativeData.map(d => d.total_payment));
  const { ticks: xAxisTicks1, labels: xAxisLabels1 } = getXAxisTicksAndLabels(maxValue1);
  const { ticks: xAxisTicks2, labels: xAxisLabels2 } = getXAxisTicksAndLabels(maxValue2);

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

  // Общий Plotly config для всех графиков
  const plotlyConfig = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: [
      'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
      'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines',
      'sendDataToCloud', 'toggleHover', 'resetViews', 'resetViewMapbox', 'zoomInGeo', 'zoomOutGeo',
      'resetGeo', 'hoverClosestGeo', 'hoverClosestGl2d', 'hoverClosestPie', 'resetViewSankey',
      'resetViewTernary', 'hoverClosestTernary', 'hoverClosestMapbox', 'zoomInMapbox', 'zoomOutMapbox',
      'resetViewMapbox', 'hoverClosestScatter3d', 'hoverClosestMesh3d', 'resetCameraDefault3d',
      'resetCameraLastSave3d', 'hoverClosestGl2d', 'hoverClosestPie', 'toggleHover', 'resetViews'
    ],
    toImageButtonOptions: {
      format: 'png',
      filename: 'график',
      height: 600,
      width: 1200,
      scale: 2
    }
  };

  // Функция для форматирования миллионов с фиксированным количеством знаков после запятой
  function formatMillionsFixed(val: number): string {
    return `${(val / 1_000_000).toFixed(1).replace('.', ',')} млн`;
  }

  console.log('[ResultsChart] data prop:', data);
  // Найти выбранную строку по сроку для основной и альтернативной данных
  const selectedData = data.find(d => d.years === annuityYears);
  const selectedAltData = alternativeData.find(d => d.years === annuityYears);

  // Форматирование для месяцев: '13 месяц (2 год)'
  function formatMonthYearLabel(month: number): string {
    const year = Math.floor((month - 1) / 12) + 1;
    return `${month} месяц (${year} год)`;
  }

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
        {/* Тогл Учитывать первоначальный взнос */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 'bold', fontSize: 15, color: '#1b263b', marginRight: 12, fontFamily: 'var(--main-font-family) !important' }} className="mortgage-form-label">
            Учитывать первоначальный взнос
          </span>
          <Switch 
            checked={withInitial} 
            onChange={setWithInitial} 
            style={withInitial ? COMMON_STYLES.switch : COMMON_STYLES.switchInactive} 
          />
        </div>
        {/* Форма и пояснительный блок */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <CompareParamsBlock
            altRate={altRate}
            altInitial={altInitial}
            altMonthly={altMonthly}
            setAltRate={setAltRate}
            setAltInitial={setAltInitial}
            setAltMonthly={setAltMonthly}
            mainRate={mainRate}
            mainInitial={mainInitial}
            mainMonthly={mainMonthly}
            isPropertyValueMode={isPropertyValueMode}
            altPropertyValue={altPropValue}
            setAltPropertyValue={setAltPropValue}
            mainPropertyValue={mainPropValue}
          />
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
            {!isPropertyValueMode && <YearlyPaymentLabel value={mainMonthly} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!isPropertyValueMode && <YearlyPaymentLabel value={altMonthly} />}
          </div>
        </div>
        {/* Легенда */}
        <ChartLegend withInitial={withInitial} />
        {/* Два графика */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Plot
              divId="plot1"
              data={chartData1.map(trace => ({
                ...trace,
                customdata: trace.x.map((val: number, i: number) => {
                  const totalPayment = totalPayments1[trace.y[i]];
                  return [Math.round(val / totalPayment * 100), Math.round(val)];
                }),
                hovertemplate: '%{customdata[0]}%<br>%{customdata[1]:,} руб.'
              }))}
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
                  tickvals: annuityMode === 'months' ? data.map((_, i) => i) : data.map((_, i) => i),
                  ticktext: annuityMode === 'months'
                    ? data.map((d, i) => formatMonthYearLabel(i + 1))
                    : data.map(d => `${formatYears(d.years)}`)
                },
                height: Math.max(400, 140 * data.length),
                margin: COMMON_STYLES.plot.margin,
                plot_bgcolor: COMMON_STYLES.plot.plot_bgcolor,
                paper_bgcolor: COMMON_STYLES.plot.paper_bgcolor,
                annotations: [...annotations1.rightAnnotations, ...annotations1.bracketAnnotations],
                shapes: [...annotations1.bracketShapes],
                showlegend: false
              }}
              config={plotlyConfig}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Plot
              divId="plot2"
              data={chartData2.map(trace => ({
                ...trace,
                customdata: trace.x.map((val: number, i: number) => {
                  const totalPayment = totalPayments2[trace.y[i]];
                  return [Math.round(val / totalPayment * 100), Math.round(val)];
                }),
                hovertemplate: '%{customdata[0]}%<br>%{customdata[1]:,} руб.'
              }))}
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
                  tickvals: annuityMode === 'months' ? alternativeData.map((_, i) => i) : alternativeData.map((_, i) => i),
                  ticktext: annuityMode === 'months'
                    ? alternativeData.map((d, i) => formatMonthYearLabel(i + 1))
                    : alternativeData.map(d => `${formatYears(d.years)}`)
                },
                height: Math.max(400, 140 * alternativeData.length),
                margin: COMMON_STYLES.plot.margin,
                plot_bgcolor: COMMON_STYLES.plot.plot_bgcolor,
                paper_bgcolor: COMMON_STYLES.plot.paper_bgcolor,
                annotations: [...annotations2.rightAnnotations, ...annotations2.bracketAnnotations],
                shapes: [...annotations2.bracketShapes],
                showlegend: false
              }}
              config={plotlyConfig}
            />
          </div>
        </div>
        {/* Таблица результатов */}
        <ResultsTable data={tableData.length ? tableData : data} mainRate={mainRate} />
        {/* --- Блок аннуитетных графиков --- */}
        <div style={{ margin: '32px 0 0 0', padding: 0, background: 'none', borderRadius: 0, border: 'none' }}>
          <h2 style={{ 
            margin: '0 0 24px 0', 
            color: '#1b263b', 
            fontSize: 24, 
            fontWeight: 'bold',
            fontFamily: 'var(--main-font-family) !important',
            textAlign: 'center',
          }}>
            Структура аннуитетного платежа
          </h2>
          {/* 1. Тогл */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              onClick={() => setAnnuityMode('months')}
              style={{
                fontWeight: annuityMode === 'months' ? 'bold' : 400,
                color: annuityMode === 'months' ? '#1b263b' : '#888',
                borderRadius: 6,
                padding: '2px 8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              По месяцам
            </span>
            <Switch
              checked={annuityMode === 'years'}
              onChange={checked => setAnnuityMode(checked ? 'years' : 'months')}
              style={annuityMode === 'years' ? COMMON_STYLES.switch : COMMON_STYLES.switchInactive}
            />
            <span
              onClick={() => setAnnuityMode('years')}
              style={{
                fontWeight: annuityMode === 'years' ? 'bold' : 400,
                color: annuityMode === 'years' ? '#1b263b' : '#888',
                borderRadius: 6,
                padding: '2px 8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              По годам
            </span>
          </div>
          {/* 2. Блок сравнения */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <CompareParamsBlock
              altRate={altRate}
              altInitial={altInitial}
              altMonthly={altMonthly}
              setAltRate={setAltRate}
              setAltInitial={setAltInitial}
              setAltMonthly={setAltMonthly}
              mainRate={mainRate}
              mainInitial={mainInitial}
              mainMonthly={mainMonthly}
              isPropertyValueMode={isPropertyValueMode}
              altPropertyValue={altPropValue}
              setAltPropertyValue={setAltPropValue}
              mainPropertyValue={mainPropValue}
            />
          </div>
          {/* 3. Ползунок срока */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px auto' }}>
            <div style={{ fontWeight: 500, fontSize: 14, color: '#1b263b', marginBottom: 4, marginLeft: 2 }}>
              <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, color: '#1b263b', marginBottom: 8 }}>
                Срок (лет)
              </div>
            </div>
            {(() => {
              const total = maxYears - minYears + 1;
              const maxLabels = 10;
              const stepLabel = Math.ceil(total / maxLabels);
             const marks = Object.fromEntries(
               Array.from({length: total}, (_, i) => {
                 const year = minYears + i;
                 if ((year - minYears) % stepLabel === 0 || year === maxYears || year === minYears) {
                   // Для выбранного значения — синий цвет и жирный, для остальных — серый
                   const isSelected = year === annuityYears;
                   return [year, {
                     label: <span style={{
                       color: isSelected ? '#1b263b' : '#bfc4c9',
                       fontSize: isSelected ? 14 : 12,
                       fontWeight: isSelected ? 700 : 500,
                       marginTop: 8,
                       transition: 'all 0.2s'
                     }}>{year}</span>
                   }];
                 }
                 return [year, ''];
               })
               .filter(([, label]) => label !== '')
             );
              // Добавить выбранный год, если его нет среди marks
              if (!marks[annuityYears]) {
                marks[annuityYears] = {
                  label: <span style={{
                    color: '#1b263b',
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 8,
                    transition: 'all 0.2s'
                  }}>{annuityYears}</span>
                };
              }
              return (
            <Slider
              min={minYears}
              max={maxYears}
                  value={sliderValue}
                  onChange={(value: number) => {
                    setSliderValue(value);
                    debouncedSetAnnuityYears(value);
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                  marks={marks}
              step={1}
                  tooltip={{ open: false, trigger: 'hover', formatter: v => `${v} лет` }}
                  trackStyle={COMMON_STYLES.slider.track}
                  handleStyle={COMMON_STYLES.slider.handle}
                  railStyle={COMMON_STYLES.slider.rail}
            />
              );
            })()}
          </div>
          {/* 4. Заголовки графиков */}
          <div style={{ display: 'flex', marginBottom: 0, marginTop: 24 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h3 style={{ marginBottom: 0, color: '#1b263b', fontFamily: 'var(--main-font-family) !important' }}>
                Текущая структура аннуитета
              </h3>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h3 style={{ marginBottom: 0, color: '#1b263b', fontFamily: 'var(--main-font-family) !important' }}>
                Структура аннуитета с измененными параметрами
              </h3>
            </div>
          </div>
          {/* Подписи (Платеж в год = ...) */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              {isPropertyValueMode ? (
                <div style={{ color: '#1b263b', fontWeight: 500, fontSize: 15, fontFamily: 'var(--main-font-family) !important' }}>
                  Ежемесячный платеж = <b>{selectedData ? Math.round(selectedData.monthly_payment).toLocaleString('ru-RU') : '-'}</b> руб.<br/>
                  Платеж в год = <b>{selectedData ? Math.round(selectedData.monthly_payment * 12).toLocaleString('ru-RU') : '-'}</b> руб.
                </div>
              ) : (
                <YearlyPaymentLabel value={mainMonthly} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              {isPropertyValueMode ? (
                <div style={{ color: '#1b263b', fontWeight: 500, fontSize: 15, fontFamily: 'var(--main-font-family) !important' }}>
                  Ежемесячный платеж = <b>{selectedAltData ? Math.round(selectedAltData.monthly_payment).toLocaleString('ru-RU') : '-'}</b> руб.<br/>
                  Платеж в год = <b>{selectedAltData ? Math.round(selectedAltData.monthly_payment * 12).toLocaleString('ru-RU') : '-'}</b> руб.
                </div>
              ) : (
                <YearlyPaymentLabel value={altMonthly} />
              )}
            </div>
          </div>
          {/* 5. Легенда */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <AnnuityLegend />
          </div>
          {/* 6. Графики */}
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ flex: 1 }}>
              {annuityLoading ? <Spin size="large" /> : annuityPlotData && annuityPlotLayout && (
                <Plot
                  data={annuityPlotData.map(trace => {
                    const total = trace.x.map((_: number, i: number) =>
                      annuityPlotData.reduce((sum: number, t: any) => sum + (t.x[i] || 0), 0)
                    );
                    const percentArr = trace.x.map((val: number, i: number) => total[i] ? Math.round((val / total[i]) * 100) : 0);
                    const absArr = trace.x.map((val: number) => formatRub(val));
                    return {
                      ...trace,
                      text: percentArr.map((p: number, i: number) => `${p}% (${formatMillionsFixed(trace.x[i])})`),
                      customdata: percentArr.map((p: number, i: number) => [p, Math.round(trace.x[i])]),
                      textfont: { size: 14 },
                      hovertemplate: '%{customdata[0]}%<br>%{customdata[1]:,} руб.'
                    };
                  })}
                  layout={{
                    ...annuityPlotLayout,
                    height: (() => {
                      const bars = annuityPlotData?.[0]?.y?.length ?? 0;
                      return annuityMode === 'months'
                        ? Math.max(200, 25 * bars)
                        : Math.max(200, 25 * bars);
                    })(),
                    width: undefined,
                    yaxis: { ...annuityPlotLayout.yaxis, autorange: 'reversed', showline: false }
                  }}
                  style={{ width: '100%', margin: '0 0.5%' }}
                  config={plotlyConfig}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              {altAnnuityLoading ? <Spin size="large" /> : altAnnuityPlotData && altAnnuityPlotLayout && (
                <Plot
                  data={altAnnuityPlotData.map(trace => {
                    const total = trace.x.map((_: number, i: number) =>
                      altAnnuityPlotData.reduce((sum: number, t: any) => sum + (t.x[i] || 0), 0)
                    );
                    const percentArr = trace.x.map((val: number, i: number) => total[i] ? Math.round((val / total[i]) * 100) : 0);
                    const absArr = trace.x.map((val: number) => formatRub(val));
                    return {
                      ...trace,
                      text: percentArr.map((p: number, i: number) => `${p}% (${formatMillionsFixed(trace.x[i])})`),
                      customdata: percentArr.map((p: number, i: number) => [p, Math.round(trace.x[i])]),
                      textfont: { size: 14 },
                      hovertemplate: '%{customdata[0]}%<br>%{customdata[1]:,} руб.'
                    };
                  })}
                  layout={{
                    ...altAnnuityPlotLayout,
                    height: (() => {
                      const bars = altAnnuityPlotData?.[0]?.y?.length ?? 0;
                      return annuityMode === 'months'
                        ? Math.max(200, 25 * bars)
                        : Math.max(200, 25 * bars);
                    })(),
                    width: undefined,
                    yaxis: { ...altAnnuityPlotLayout.yaxis, autorange: 'reversed', showline: false }
                  }}
                  style={{ width: '100%', margin: '0 0.5%' }}
                  config={plotlyConfig}
                />
          )}
            </div>
          </div>
        </div>
        <style>
          {`
            .ant-switch-checked {
              background: #1b263b !important;
              border-color: #1b263b !important;
            }
            .ant-switch {
              border-color: #1b263b !important;
            }
            .ant-switch-handle {
              background: none !important;
              border: none !important;
              box-shadow: none !important;
            }
            .chart-toggle-row, .chart-toggle-row * {
              font-family: var(--main-font-family) !important;
            }
            .ant-slider-dot {
              display: none !important;
            }
          `}
        </style>
      </div>
    </div>
  );
}; 