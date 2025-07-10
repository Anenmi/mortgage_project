import React from 'react';
import { Table, Tooltip, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { InfoCircleOutlined } from '@ant-design/icons';
import { MortgageResult } from '../api/mortgage';

const columns = [
  { 
    title: 'Срок кредита (лет)', 
    dataIndex: 'years', 
    key: 'years',
    width: '12%',
    render: (v: number) => `${v} лет`
  },
  { 
    title: 'Общая выплата', 
    dataIndex: 'total_payment', 
    key: 'total_payment', 
    width: '16%',
    render: (v: number) => v.toLocaleString('ru-RU') + ' руб.'
  },
  { 
    title: 'Первоначальный взнос', 
    dataIndex: 'initial_payment', 
    key: 'initial_payment', 
    width: '16%',
    render: (v: number, record: any) => {
      const propertyValue = record.initial_payment + record.principal;
      const percentage = Math.round((record.initial_payment / propertyValue) * 100);
      return (
        <span>
          {v.toLocaleString('ru-RU')} руб. {' '}
          <span style={{ color: '#999', fontStyle: 'italic' }}>
            ({percentage}%)
          </span>
        </span>
      );
    }
  },
  { 
    title: 'Сумма кредита', 
    dataIndex: 'principal', 
    key: 'principal', 
    width: '16%',
    render: (v: number) => v.toLocaleString('ru-RU') + ' руб.' 
  },
  { 
    title: 'Стоимость жилья', 
    key: 'property_value', 
    width: '16%',
    render: (record: any) => (record.initial_payment + record.principal).toLocaleString('ru-RU') + ' руб.' 
  },
  { 
    title: 'Переплата за кредит', 
    dataIndex: 'overpayment', 
    key: 'overpayment', 
    width: '20%',
    render: (v: number, record: any) => {
      const percentage = Math.round(record.overpayment_percentage * 100);
      return (
        <span>
          {v.toLocaleString('ru-RU')} руб. {' '}
          <span style={{ color: '#999', fontStyle: 'italic' }}>
            ({percentage}%)
          </span>
        </span>
      );
    }
  }
];

export const ResultsTable: React.FC<{ data: MortgageResult[] }> = ({ data }) => {
  if (!data.length) return null;

  const handleDownloadExcel = () => {
    // Создаем CSV данные
    const headers = ['Срок кредита (лет)', 'Общая выплата (руб.)', 'Первоначальный взнос (руб.)', 'Сумма кредита (руб.)', 'Стоимость жилья (руб.)', 'Переплата за кредит (руб.)', 'Процент переплаты (%)'];
    const csvData = data.map(record => [
      record.years,
      record.total_payment,
      record.initial_payment,
      record.principal,
      record.initial_payment + record.principal,
      record.overpayment,
      Math.round(record.overpayment_percentage * 100)
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ипотечный_расчет.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<DownloadOutlined style={{ fontSize: 16 }} />} 
          onClick={handleDownloadExcel}
          style={{ 
            background: '#415a77', 
            borderColor: '#415a77',
            borderRadius: 6,
            fontWeight: 500,
            width: 28,
            height: 28,
            minWidth: 28,
            minHeight: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
        />
      </div>
      <style>
        {`
          .custom-table .ant-table-thead > tr > th {
            background: #415a77 !important;
            color: #fff !important;
            font-weight: bold;
          }
        `}
      </style>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="years"
        pagination={false}
        style={{ marginBottom: 32, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', fontSize: '13px' }}
        size="middle"
        scroll={{ x: true }}
        tableLayout="fixed"
        className="custom-table"
      />
    </>
  );
}; 