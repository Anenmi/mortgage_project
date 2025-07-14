import React, { useState } from 'react';
import { MortgageForm } from './MortgageForm';
import { ResultsChart } from './ResultsChart';
import { calculateMortgage, MortgageResult, MortgageParams } from '../api/mortgage';

const MonthlyPaymentMode: React.FC = () => {
  const [data, setData] = useState<MortgageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainRate, setMainRate] = useState(16.5);

  const handleCalculate = async (params: MortgageParams) => {
    setLoading(true);
    try {
      const res = await calculateMortgage(params);
      setData(res);
      setMainRate(params.interest_rate); // обновляем ставку
    } catch (e) {
      alert('Ошибка при расчёте');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 32, background: '#f8f9fa', minHeight: '100vh' }}>
      <h1 className="mortgage-form-label" style={{ textAlign: 'center', color: '#264653', marginBottom: 24 }}>Ипотечный калькулятор</h1>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 32, maxWidth: 900, margin: '0 auto 32px auto' }}>
        <MortgageForm onCalculate={handleCalculate} />
      </div>
      {data.length > 0 && (
        <ResultsChart data={data} mainRate={mainRate} />
      )}
    </div>
  );
};

export default MonthlyPaymentMode; 