export interface AmortizationRow {
  month: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

/**
 * Calculates Equated Monthly Installment (EMI) for a loan using reducing balance.
 */
export function calculateEMI(principal: number, annualInterestRate: number, tenureYears: number): number {
  if (principal <= 0 || tenureYears <= 0) return 0;
  
  // If 0% interest, just divide by total months
  if (annualInterestRate === 0) {
    return principal / (tenureYears * 12);
  }

  const r = (annualInterestRate / 100) / 12;
  const n = tenureYears * 12;
  
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Generates a full amortization schedule month-by-month.
 */
export function generateAmortizationSchedule(principal: number, annualInterestRate: number, tenureYears: number): AmortizationRow[] {
  if (principal <= 0 || tenureYears <= 0) return [];

  const r = (annualInterestRate / 100) / 12;
  const n = tenureYears * 12;
  const emi = calculateEMI(principal, annualInterestRate, tenureYears);
  
  const schedule: AmortizationRow[] = [];
  let balance = principal;

  for (let month = 1; month <= n; month++) {
    const interestPaid = balance * r;
    let principalPaid = emi - interestPaid;
    
    // Adjust final payment rounding errors
    if (month === n || balance - principalPaid < 0) {
      principalPaid = balance;
    }

    balance -= principalPaid;

    schedule.push({
      month,
      payment: principalPaid + interestPaid,
      principalPaid,
      interestPaid,
      remainingBalance: Math.max(0, balance)
    });

    if (balance <= 0) break;
  }

  return schedule;
}
