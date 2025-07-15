import React from 'react';
import { Form, InputNumber } from 'antd';

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

export default FloatingLabelNumber; 