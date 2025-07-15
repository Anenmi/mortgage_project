export interface MortgageParams {
  interest_rate: number;
  monthly_payment?: number;
  property_value?: number;
  initial_payment: number;
  min_years: number;
  max_years: number;
  min_initial_payment_percentage: number;
}

export interface MortgageResult {
  years: number;
  principal: number;
  initial_payment: number;
  property_value: number;
  monthly_payment: number;
  total_payment: number;
  overpayment: number;
  overpayment_percentage: number;
  min_initial_payment_percentage: number;
}

export async function calculateMortgage(params: MortgageParams): Promise<MortgageResult[]> {
  const mode = params.property_value !== undefined && params.property_value > 0 ? 'property_value' : 'monthly_payment';
  const payload: any = { ...params, mode };
  if (mode === 'property_value') {
    delete payload.monthly_payment;
    if (!payload.property_value || payload.property_value <= 0) {
      throw new Error('Стоимость жилья должна быть больше 0');
    }
  }
  if (mode === 'monthly_payment') {
    delete payload.property_value;
  }
  delete payload.mode2;
  // Удаляем все поля с value === undefined, null или (для property_value) 0
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined || payload[key] === null || (key === 'property_value' && payload[key] === 0)) delete payload[key];
  });
  const res = await fetch('http://localhost:5000/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
  const data = await res.json();
  return data;
} 