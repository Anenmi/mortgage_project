import React, { useEffect } from 'react';
import { Form, Slider } from 'antd';
import FloatingLabelNumber from './FloatingLabelNumber';
import { ResultsChart } from './ResultsChart';
import { calculateMortgage, MortgageResult } from '../api/mortgage';

const PropertyValueMode: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = React.useState<MortgageResult[]>([]);
  const [mainRate, setMainRate] = React.useState(16.5);

  // Значения формы
  const interest_rate = Form.useWatch('interest_rate', form) ?? 16.5;
  const property_value = Form.useWatch('property_value', form) ?? 6000000;
  const initial_payment = Form.useWatch('initial_payment', form) ?? 1200000;
  const min_initial_payment_percentage = Form.useWatch('min_initial_payment_percentage', form) ?? 20;
  const years = Form.useWatch('years', form) ?? [5, 20];

  // Вычисление ежемесячного платежа по формуле аннуитета
  const calcMonthly = (sum: number, rate: number, years: number) => {
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return sum / months;
    return sum * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  };

  // Автоматический расчет при изменении значений
  const triggerCalculate = (values: any) => {
    console.log('[triggerCalculate] values:', values);
    const { interest_rate, property_value, initial_payment, min_initial_payment_percentage, years } = values;
    if (
      interest_rate !== undefined &&
      property_value !== undefined &&
      property_value > 0 &&
      initial_payment !== undefined &&
      min_initial_payment_percentage !== undefined &&
      years && years.length === 2
    ) {
      const [min_years, max_years] = years;
      calculateMortgage({
        interest_rate,
        property_value,
        initial_payment,
        min_years,
        max_years,
        min_initial_payment_percentage,
      })
        .then(res => {
          console.log('[triggerCalculate] API result:', res);
          setData(res);
          setMainRate(interest_rate);
        })
        .catch(() => setData([]));
    } else {
      setData([]);
    }
  };

  useEffect(() => {
    triggerCalculate(form.getFieldsValue());
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    console.log('[PropertyValueMode] data updated:', data);
  }, [data]);

  const mainPropertyValue = data[0]?.property_value ?? 0;
  const [altPropertyValue, setAltPropertyValue] = React.useState(mainPropertyValue);
  // Сброс альтернативного значения при изменении основного
  React.useEffect(() => { setAltPropertyValue(mainPropertyValue); }, [mainPropertyValue]);

  return (
    <div style={{ padding: 32, background: '#f8f9fa', minHeight: '100vh' }}>
      <h1 className="mortgage-form-label" style={{ textAlign: 'center', color: '#264653', marginBottom: 24 }}>Ипотечный калькулятор</h1>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 32, maxWidth: 900, margin: '0 auto 32px auto' }}>
        <Form
          form={form}
          layout="inline"
          initialValues={{
            interest_rate: 6.0,
            property_value: 10000000,
            initial_payment: 3000000,
            min_initial_payment_percentage: 20,
            years: [1, 10],
          }}
          onValuesChange={(_, values) => triggerCalculate(values)}
          style={{ marginBottom: 32, flexWrap: 'wrap', gap: 16, justifyContent: 'center', display: 'flex', alignItems: 'center' }}
        >
          <FloatingLabelNumber label="Ставка (%)" name="interest_rate" min={0} max={100} step={0.01} form={form} />
          <FloatingLabelNumber label="Стоимость жилья (руб.)" name="property_value" min={0} step={10000} form={form} formatter={(v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(v: any) => Number((v || '').toString().replace(/\s/g, ''))} />
          <FloatingLabelNumber label="Первоначальный взнос (руб.)" name="initial_payment" min={0} step={10000} form={form} formatter={(v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(v: any) => Number((v || '').toString().replace(/\s/g, ''))} />
          <FloatingLabelNumber label="Минимальный первоначальный взнос (%)" name="min_initial_payment_percentage" min={0} max={100} step={1} form={form} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 340 }}>
            <label htmlFor="years" style={{ marginBottom: 8, fontWeight: 'bold' }} className="mortgage-form-label">Срок (лет)</label>
            <Form.Item name="years" style={{ marginBottom: 0 }}>
              <Slider
                id="years"
                range
                min={1}
                max={30}
                defaultValue={[5, 20]}
                style={{ width: 320 }}
                trackStyle={[{ backgroundColor: '#415a77' }, { backgroundColor: '#1b263b' }]}
                handleStyle={[
                  { borderColor: '#1b263b', backgroundColor: '#1b263b' },
                  { borderColor: '#1b263b', backgroundColor: '#1b263b' }
                ]}
                railStyle={{ backgroundColor: '#e0e0e0' }}
                marks={form.getFieldValue('years') ? {
                  [form.getFieldValue('years')[0]]: form.getFieldValue('years')[0].toString(),
                  [form.getFieldValue('years')[1]]: form.getFieldValue('years')[1].toString()
                } : {}}
              />
            </Form.Item>
          </div>
        </Form>
      </div>
      {data.length > 0 && (
        <ResultsChart
          data={data}
          mainRate={mainRate}
          hideYearlyPaymentInfo={true}
          isPropertyValueMode={true}
          altPropertyValue={altPropertyValue}
          setAltPropertyValue={setAltPropertyValue}
          mainPropertyValue={mainPropertyValue}
        />
      )}
    </div>
  );
};

export default PropertyValueMode; 