import React, { useState } from 'react';
import { MortgageForm } from './components/MortgageForm';
import { ResultsChart } from './components/ResultsChart';
import { calculateMortgage, MortgageResult, MortgageParams } from './api/mortgage';

const App: React.FC = () => {
  const [data, setData] = useState<MortgageResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async (params: MortgageParams) => {
    setLoading(true);
    try {
      const res = await calculateMortgage(params);
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
        <MortgageForm onCalculate={handleCalculate} loading={loading} />
      </div>
      {data.length > 0 && (
        <ResultsChart data={data} />
      )}
    </div>
  );
};

export default App;
