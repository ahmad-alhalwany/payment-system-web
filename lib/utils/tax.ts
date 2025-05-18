// دوال إدارة الضرائب (مبسطة)
export function calculateTax(amount: number, rate: number): number {
  return amount * (rate / 100);
}

export function calculateNetAmount(amount: number, rate: number): number {
  return amount - calculateTax(amount, rate);
} 