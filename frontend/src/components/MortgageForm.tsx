import React, { useEffect } from 'react';
import { Form, InputNumber, Slider } from 'antd';
import { MortgageParams } from '../api/mortgage';

type Props = {
  onCalculate: (params: MortgageParams) => void;
};

// Приватный компонент с плавающим лейблом
const FloatingLabelNumber: React.FC<{
  label: string;
  name: string;
  min?: number;
  max?: number;
  step?: number;
  form: any;
  formatter?: (v: any) => string;
  parser?: (v: any) => number;
}> = ({ label, name, min, max, step, form, formatter, parser }) => {
  const [focused, setFocused] = React.useState(false);
  const value = Form.useWatch(name, form);
  return (
    <div style={{ position: 'relative', minWidth: 290, width: 290, display: 'flex', alignItems: 'center' }}>
      <Form.Item name={name} style={{ marginBottom: 0, width: '100%' }} rules={[{ required: true }]}> 
        <InputNumber
          min={min}
          max={max}
          step={step}
          formatter={formatter}
          parser={parser}
          style={{ width: '100%', background: '#e9ecef', border: '1px solid #d1d5db', paddingTop: 22, paddingBottom: 6, paddingLeft: 12, fontSize: 16, minWidth: 290 }}
          placeholder={focused ? '' : label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Form.Item>
      <span
        style={{
          position: 'absolute',
          left: 16,
          top: (focused || value !== undefined) ? 4 : 18,
          fontSize: (focused || value !== undefined) ? 12 : 16,
          color: (focused || value !== undefined) ? '#888' : '#bbb',
          zIndex: 2,
          pointerEvents: 'none',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const MortgageForm: React.FC<Props> = ({ onCalculate }) => {
  const [form] = Form.useForm();

  // Автоматический расчет при изменении значений
  const triggerCalculate = (values: any) => {
    const { interest_rate, monthly_payment, initial_payment, min_initial_payment_percentage, years } = values;
    if (
      interest_rate !== undefined &&
      monthly_payment !== undefined &&
      initial_payment !== undefined &&
      min_initial_payment_percentage !== undefined &&
      years && years.length === 2
    ) {
      const [min_years, max_years] = years;
      onCalculate({
        interest_rate,
        monthly_payment,
        initial_payment,
        min_initial_payment_percentage,
        min_years,
        max_years
      });
    }
  };

  useEffect(() => {
    triggerCalculate(form.getFieldsValue());
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <style>{`
        .ant-form-item-label > label { display: none !important; }
        .mortgage-form-label { color: #1b263b !important; }
        .ant-input-number { outline: none !important; box-shadow: none !important; border: none !important; background: #e9ecef !important; transition: background 0.2s, border 0.2s; }
        .ant-input-number:focus, .ant-input-number-focused, .ant-input-number[aria-valuenow]:not([aria-valuenow='']) { background: #fff !important; border: 1px solid #bfc4c9 !important; }
        .ant-input-number input[type=number]::-webkit-inner-spin-button, .ant-input-number input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ant-input-number input[type=number] { -moz-appearance: textfield; }
        .ant-input-number-handler-wrap { display: none !important; }
      `}</style>
      <Form
        form={form}
        layout="inline"
        initialValues={{
          interest_rate: 16.5,
          monthly_payment: 300000,
          initial_payment: 5000000,
          min_initial_payment_percentage: 20,
          years: [5, 20]
        }}
        onValuesChange={(_, values) => triggerCalculate(values)}
        style={{ marginBottom: 32, flexWrap: 'wrap', gap: 16, justifyContent: 'center', display: 'flex', alignItems: 'center' }}
      >
        <FloatingLabelNumber label="Ставка (%)" name="interest_rate" min={0} max={100} step={0.01} form={form} />
        <FloatingLabelNumber label="Ежемесячный платёж (руб.)" name="monthly_payment" min={0} step={1000} form={form} formatter={(v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(v: any) => Number((v || '').toString().replace(/\s/g, ''))} />
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
              defaultValue={[5, 10]} 
              style={{ width: 320 }}
              trackStyle={[{ backgroundColor: '#415a77' }, { backgroundColor: '#415a77' }]}
              handleStyle={[
                { borderColor: '#415a77', backgroundColor: '#415a77' }, 
                { borderColor: '#415a77', backgroundColor: '#415a77' }
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
  );
}; 