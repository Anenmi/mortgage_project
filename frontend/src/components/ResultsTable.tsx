import React, { useMemo } from 'react';
import { Table, Tooltip, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { InfoCircleOutlined } from '@ant-design/icons';
import { MortgageResult } from '../api/mortgage';

export const ResultsTable: React.FC<{ data: MortgageResult[], mainRate: number }> = ({ data, mainRate }) => {
  // Функция для расчета ширины текста (приблизительно)
  const getTextWidth = (text: string, fontSize: number = 13) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
      return context.measureText(text).width;
    }
    return text.length * fontSize * 0.6; // fallback
  };

  // Функция для форматирования чисел
  const formatNumber = (num: number) => num.toLocaleString('ru-RU');

  // Расчет максимальной ширины для каждого столбца
  const columnWidths = useMemo(() => {
    if (!data.length) return 200; // fallback width if no data
    
    const widths: { [key: string]: number } = {
      years: 0,
      total_payment: 0,
      initial_payment: 0,
      principal: 0,
      property_value: 0,
      overpayment: 0
    };

    // Заголовки столбцов
    const headers = [
      'Срок кредита (лет)',
      'Общая выплата',
      'Первоначальный взнос',
      'Сумма кредита',
      'Стоимость жилья',
      'Переплата за кредит'
    ];

    headers.forEach((header, index) => {
      const key = Object.keys(widths)[index];
      if (key) {
        widths[key] = Math.max(widths[key], getTextWidth(header, 14)); // заголовки обычно больше
      }
    });

    // Данные
    data.forEach(record => {
      // Срок кредита
      const yearsText = `${record.years} лет`;
      widths.years = Math.max(widths.years, getTextWidth(yearsText));

      // Общая выплата
      const totalText = `${formatNumber(record.total_payment)} руб.`;
      widths.total_payment = Math.max(widths.total_payment, getTextWidth(totalText));

      // Первоначальный взнос
      const propertyValue = record.initial_payment + record.principal;
      const initialPercentage = Math.round((record.initial_payment / propertyValue) * 100);
      const initialText = `${formatNumber(record.initial_payment)} руб. (${initialPercentage}%)`;
      widths.initial_payment = Math.max(widths.initial_payment, getTextWidth(initialText));

      // Сумма кредита
      const principalText = `${formatNumber(record.principal)} руб.`;
      widths.principal = Math.max(widths.principal, getTextWidth(principalText));

      // Стоимость жилья
      const propertyText = `${formatNumber(propertyValue)} руб.`;
      widths.property_value = Math.max(widths.property_value, getTextWidth(propertyText));

      // Переплата
      const overpaymentPercentage = Math.round(record.overpayment_percentage * 100);
      const overpaymentText = `${formatNumber(record.overpayment)} руб. (${overpaymentPercentage}%)`;
      widths.overpayment = Math.max(widths.overpayment, getTextWidth(overpaymentText));
    });

    // Добавляем отступы для комфортного отображения
    const padding = 20;
    Object.keys(widths).forEach(key => {
      widths[key] += padding;
    });

    // Находим максимальную ширину среди всех столбцов
    const maxWidth = Math.max(...Object.values(widths));

    // Адаптивная логика: на больших экранах уменьшаем ширину
    const screenWidth = window.innerWidth;
    const numColumns = 6; // количество столбцов
    const totalTableWidth = maxWidth * numColumns;
    
    // Если таблица слишком широкая для экрана, уменьшаем ширину столбцов
    if (screenWidth > 1200 && totalTableWidth > screenWidth * 0.5) {
      // На больших экранах ограничиваем ширину таблицы до 80% от ширины экрана
      const maxTableWidth = screenWidth * 0.5;
      const adjustedColumnWidth = Math.max(maxTableWidth / numColumns, 200); // минимум 200px
      return adjustedColumnWidth;
    } else if (screenWidth > 1600 && totalTableWidth > 900) {
      // На очень больших экранах ограничиваем общую ширину таблицы
      const adjustedColumnWidth = Math.max(900 / numColumns, 200);
      return adjustedColumnWidth;
    }

    return maxWidth;
  }, [data]);

  if (!data.length) return null;

  const columns = [
    { 
      title: 'Срок кредита (лет)', 
      dataIndex: 'years', 
      key: 'years',
      width: columnWidths,
      render: (v: number) => `${v} лет`
    },
    // Новая колонка Ставка
    {
      title: 'Ставка',
      key: 'rate',
      width: columnWidths,
      render: () => `${mainRate.toFixed(2).replace('.', ',')}%`
    },
    { 
      title: 'Общая выплата', 
      dataIndex: 'total_payment', 
      key: 'total_payment', 
      width: columnWidths,
      render: (v: number) => formatNumber(v) + ' руб.'
    },
    { 
      title: 'Первоначальный взнос', 
      dataIndex: 'initial_payment', 
      key: 'initial_payment', 
      width: columnWidths,
      render: (v: number, record: any) => {
        const propertyValue = record.initial_payment + record.principal;
        const percentage = Math.round((record.initial_payment / propertyValue) * 100);
        return (
          <span>
            {formatNumber(v)} руб. {' '}
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
      width: columnWidths,
      render: (v: number) => formatNumber(v) + ' руб.' 
    },
    { 
      title: 'Стоимость жилья', 
      key: 'property_value', 
      width: columnWidths,
      render: (record: any) => formatNumber(record.initial_payment + record.principal) + ' руб.' 
    },
    { 
      title: 'Переплата за кредит', 
      dataIndex: 'overpayment', 
      key: 'overpayment', 
      width: columnWidths,
      render: (v: number, record: any) => {
        const percentage = Math.round(record.overpayment_percentage * 100);
        return (
          <span>
            {formatNumber(v)} руб. {' '}
            <span style={{ color: '#999', fontStyle: 'italic' }}>
              ({percentage}%)
            </span>
          </span>
        );
      }
    }
  ];

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
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="years"
          pagination={false}
          style={{ 
            marginBottom: 32, 
            background: '#fff', 
            borderRadius: 8, 
            boxShadow: '0 2px 8px #eee', 
            fontSize: '13px',
            width: 'fit-content',
            maxWidth: '100%'
          }}
          size="middle"
          scroll={{ x: true }}
          tableLayout="fixed"
          className="custom-table"
        />
      </div>
    </>
  );
}; 