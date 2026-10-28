(function (root) {
  'use strict';

  // Pure financial math. No DOM access. Rates are annual percentages (6 means 6%).

  const monthsFor = (years) => Math.max(1, Math.round(years * 12));

  /** Monthly payment for a fully amortizing loan. */
  function loanPayment(principal, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = monthsFor(years);
    if (r === 0) return principal / n;
    return (principal * r) / (1 - (1 + r) ** -n);
  }

  /** Month-by-month amortization aggregated into yearly rows. */
  function amortizationSchedule(principal, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = monthsFor(years);
    const payment = loanPayment(principal, annualRatePct, years);
    let balance = principal;
    let totalPaid = 0;
    let totalInterest = 0;
    const rows = [];
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let m = 1; m <= n; m++) {
      const interest = balance * r;
      let principalPart = payment - interest;
      let paid = payment;
      if (m === n) {
        // Final month: clear the remaining balance exactly.
        principalPart = balance;
        paid = principalPart + interest;
        balance = 0;
      } else {
        balance = Math.max(0, balance - principalPart);
      }
      totalPaid += paid;
      totalInterest += interest;
      yearPrincipal += principalPart;
      yearInterest += interest;

      if (m % 12 === 0 || m === n) {
        rows.push({
          year: Math.ceil(m / 12),
          principalPaid: yearPrincipal,
          interestPaid: yearInterest,
          endingBalance: balance,
        });
        yearPrincipal = 0;
        yearInterest = 0;
      }
    }
    return { payment, totalPaid, totalInterest, years: rows };
  }

  /** Compound growth with end-of-month contributions. */
  function compoundGrowth({ initial, monthlyContribution, annualRatePct, years, compoundsPerYear }) {
    const i = (1 + annualRatePct / 100 / compoundsPerYear) ** (compoundsPerYear / 12) - 1;
    const months = monthsFor(years);
    let balance = initial;
    const rows = [];

    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + i) + monthlyContribution;
      if (m % 12 === 0 || m === months) {
        const contributions = initial + monthlyContribution * m;
        rows.push({
          year: Math.ceil(m / 12),
          balance,
          contributions,
          interest: balance - contributions,
        });
      }
    }
    const totalContributions = initial + monthlyContribution * months;
    return {
      finalBalance: balance,
      totalContributions,
      totalInterest: balance - totalContributions,
      years: rows,
    };
  }

  /** Monthly deposit required to reach a target (end-of-month deposits, monthly compounding). */
  function savingsGoalMonthly({ target, initial, annualRatePct, years }) {
    const i = annualRatePct / 100 / 12;
    const n = monthsFor(years);
    const fvInitial = initial * (1 + i) ** n;
    if (fvInitial >= target) return 0;
    if (i === 0) return (target - initial) / n;
    return ((target - fvInitial) * i) / ((1 + i) ** n - 1);
  }

  /** Simple ROI and compound annual growth rate. */
  function roi({ initial, final, years }) {
    return {
      gain: final - initial,
      roiPct: ((final - initial) / initial) * 100,
      cagrPct: ((final / initial) ** (1 / years) - 1) * 100,
    };
  }

  /**
   * Validate raw field values.
   * fields: { name: rawValue }  (strings or numbers)
   * rules:  { name: { label, kind } } where kind is one of
   *   'amount'   finite, >= 0
   *   'positive' finite, > 0
   *   'years'    finite, > 0 and <= 100
   *   'rate'     finite, >= 0 and <= 100
   * Returns an array of error strings (empty when valid).
   */
  function validate(fields, rules) {
    const errors = [];
    for (const [name, rule] of Object.entries(rules)) {
      const raw = fields[name];
      const label = rule.label || name;
      if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        errors.push(`${label} is required.`);
        continue;
      }
      const v = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(v)) {
        errors.push(`${label} must be a valid number.`);
        continue;
      }
      switch (rule.kind) {
        case 'positive':
          if (v <= 0) errors.push(`${label} must be greater than 0.`);
          break;
        case 'years':
          if (v <= 0 || v > 100) errors.push(`${label} must be greater than 0 and at most 100.`);
          break;
        case 'rate':
          if (v < 0 || v > 100) errors.push(`${label} must be between 0 and 100.`);
          break;
        default:
          if (v < 0) errors.push(`${label} cannot be negative.`);
      }
    }
    return errors;
  }

  const loanRules = {
    principal: { label: 'Loan amount', kind: 'positive' },
    rate: { label: 'Interest rate', kind: 'rate' },
    years: { label: 'Loan term (years)', kind: 'years' },
  };
  const compoundRules = {
    initial: { label: 'Initial deposit', kind: 'amount' },
    monthly: { label: 'Monthly contribution', kind: 'amount' },
    rate: { label: 'Annual interest rate', kind: 'rate' },
    years: { label: 'Years', kind: 'years' },
  };
  const savingsRules = {
    target: { label: 'Target amount', kind: 'amount' },
    initial: { label: 'Current savings', kind: 'amount' },
    rate: { label: 'Annual interest rate', kind: 'rate' },
    years: { label: 'Years', kind: 'years' },
  };
  const roiRules = {
    initial: { label: 'Initial investment', kind: 'positive' },
    final: { label: 'Final value', kind: 'amount' },
    years: { label: 'Years', kind: 'years' },
  };

  root.FinCalc = Object.freeze({
    loanPayment,
    amortizationSchedule,
    compoundGrowth,
    savingsGoalMonthly,
    roi,
    validate,
    loanRules,
    compoundRules,
    savingsRules,
    roiRules,
  });
})(globalThis);
