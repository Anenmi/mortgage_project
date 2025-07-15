import React, { useState } from 'react';
import './App.css';
import MonthlyPaymentMode from './components/MonthlyPaymentMode';
import PropertyValueMode from './components/PropertyValueMode';

function App() {
  const [activeTab, setActiveTab] = useState<'monthly' | 'property'>('property');

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
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
          <button
            onClick={() => setActiveTab('property')}
            style={{
              flex: 1,
              background: activeTab === 'property' ? '#1b263b' : '#e9ecef',
              border: 'none',
              color: activeTab === 'property' ? '#fff' : '#1b263b',
              fontWeight: activeTab === 'property' ? 700 : 400,
              fontSize: 16,
              padding: '0 0',
              height: '100%',
              cursor: 'pointer',
              borderBottom: activeTab === 'property' ? '2px solid #a8dadc' : '3px solid transparent',
              transition: 'all 0.2s',
              outline: 'none',
              borderRadius: '0',
            }}
          >
            Если знаю стоимость жилья
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            style={{
              flex: 1,
              background: activeTab === 'monthly' ? '#1b263b' : '#e9ecef',
              border: 'none',
              color: activeTab === 'monthly' ? '#fff' : '#1b263b',
              fontWeight: activeTab === 'monthly' ? 700 : 400,
              fontSize: 16,
              padding: '0 0',
              height: '100%',
              cursor: 'pointer',
              borderBottom: activeTab === 'monthly' ? '2px solid #a8dadc' : '3px solid transparent',
              transition: 'all 0.2s',
              outline: 'none',
              borderRadius: '0',
            }}
          >
            Если знаю ежемесячный платеж
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
