export interface MortgageParams {
  interest_rate: number;
  monthly_payment: number;
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
  console.log('API call with params:', params);
  console.log('API URL:', 'http://localhost:5000/api/calculate');
  
  const res = await fetch('http://localhost:5000/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  console.log('API response status:', res.status);
  console.log('API response ok:', res.ok);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('API error response:', errorText);
    throw new Error('Ошибка при расчёте');
  }
  
  const data = await res.json();
  console.log('API response data:', data);
  return data;
} 