import React, { useState } from 'react';
import { ResultsChart } from './ResultsChart';
import { calculateMortgage, MortgageResult } from '../api/mortgage';

const PropertyValueMode: React.FC = () => {
  const [propertyValue, setPropertyValue] = useState<number>(6000000);
  const [initialPayment, setInitialPayment] = useState<number>(1200000);
  const [rate, setRate] = useState<number>(16.5);
  const [years, setYears] = useState<number>(20);
  const [minInitialPct, setMinInitialPct] = useState<number>(20);
  const [data, setData] = useState<MortgageResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Вычисление ежемесячного платежа по формуле аннуитета
  function calculateMonthlyPayment(sum: number, rate: number, years: number) {
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return sum / months;
    return sum * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  }

  const handleCalculate = async () => {
    const loanSum = propertyValue - initialPayment;
    const monthly = calculateMonthlyPayment(loanSum, rate, years);
    setLoading(true);
    try {
      const res = await calculateMortgage({
        interest_rate: rate,
        monthly_payment: monthly,
        initial_payment: initialPayment,
        min_years: years,
        max_years: years,
        min_initial_payment_percentage: minInitialPct,
      });
      setData(res);
    } catch (e) {
      alert('Ошибка при расчёте');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 32, background: '#f8f9fa', minHeight: '100vh' }}>
      <h1 className="mortgage-form-label" style={{ textAlign: 'center', color: '#264653', marginBottom: 24 }}>Ипотечный калькулятор</h1>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 32, maxWidth: 900, margin: '0 auto 32px auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label>
            <span style={{ fontWeight: 500 }}>Стоимость жилья</span>
            <input type="number" value={propertyValue} min={0} step={10000} onChange={e => setPropertyValue(Number(e.target.value))} style={{ width: 200, marginLeft: 12 }} />
          </label>
          <label>
            <span style={{ fontWeight: 500 }}>Первоначальный взнос</span>
            <input type="number" value={initialPayment} min={0} step={10000} onChange={e => setInitialPayment(Number(e.target.value))} style={{ width: 200, marginLeft: 12 }} />
          </label>
          <label>
            <span style={{ fontWeight: 500 }}>Ставка (%)</span>
            <input type="number" value={rate} min={0} max={100} step={0.1} onChange={e => setRate(Number(e.target.value))} style={{ width: 100, marginLeft: 12 }} />
          </label>
          <label>
            <span style={{ fontWeight: 500 }}>Срок (лет)</span>
            <input type="number" value={years} min={1} max={40} step={1} onChange={e => setYears(Number(e.target.value))} style={{ width: 100, marginLeft: 12 }} />
          </label>
          <label>
            <span style={{ fontWeight: 500 }}>Минимальный первоначальный взнос (%)</span>
            <input type="number" value={minInitialPct} min={0} max={100} step={1} onChange={e => setMinInitialPct(Number(e.target.value))} style={{ width: 100, marginLeft: 12 }} />
          </label>
          <button onClick={handleCalculate} style={{ marginTop: 16, width: 200, background: '#1b263b', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Рассчитать
          </button>
        </div>
      </div>
      {data.length > 0 && (
        <ResultsChart data={data} mainRate={rate} />
      )}
    </div>
  );
};

export default PropertyValueMode; 