import React, { useState } from 'react';
import './App.css';
import MonthlyPaymentMode from './components/MonthlyPaymentMode';
import PropertyValueMode from './components/PropertyValueMode';

function App() {
  const [activeTab, setActiveTab] = useState<'monthly' | 'property'>('monthly');

  return (
    <div>
      {/* Навигационная панель */}
      <nav style={{
        background: '#1b263b',
        padding: '0 0',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        boxShadow: '0 2px 8px 0 rgba(30, 42, 73, 0.08)',
        marginBottom: 0
      }}>
        <div style={{ display: 'flex', height: '100%' }}>
          <button
            onClick={() => setActiveTab('monthly')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'monthly' ? '#fff' : '#bfc9da',
              fontWeight: activeTab === 'monthly' ? 700 : 400,
              fontSize: 18,
              padding: '0 32px',
              height: '100%',
              cursor: 'pointer',
              borderBottom: activeTab === 'monthly' ? '3px solid #fff' : '3px solid transparent',
              transition: 'all 0.2s',
              outline: 'none',
            }}
          >
            Если знаю ежемесячный платеж
          </button>
          <button
            onClick={() => setActiveTab('property')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'property' ? '#fff' : '#bfc9da',
              fontWeight: activeTab === 'property' ? 700 : 400,
              fontSize: 18,
              padding: '0 32px',
              height: '100%',
              cursor: 'pointer',
              borderBottom: activeTab === 'property' ? '3px solid #fff' : '3px solid transparent',
              transition: 'all 0.2s',
              outline: 'none',
            }}
          >
            Если знаю стоимость жилья
          </button>
        </div>
      </nav>
      {/* Контент вкладки */}
      <div style={{ background: '#f7f9fb', minHeight: '100vh', paddingTop: 0 }}>
        {activeTab === 'monthly' && <MonthlyPaymentMode />}
        {activeTab === 'property' && <PropertyValueMode />}
      </div>
    </div>
  );
}

export default App;
