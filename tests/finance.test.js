import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/finance.js';

const {
  loanPayment,
  amortizationSchedule,
  compoundGrowth,
  savingsGoalMonthly,
  roi,
  validate,
  loanRules,
  roiRules,
} = globalThis.FinCalc;

const close = (a, b, eps = 0.01) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} to be within ${eps} of ${b}`);

test('loanPayment standard and zero-rate', () => {
  close(loanPayment(200000, 6, 30), 1199.1);
  assert.equal(loanPayment(12000, 0, 1), 1000);
});

test('amortizationSchedule 200000 @ 6% for 30y', () => {
  const s = amortizationSchedule(200000, 6, 30);
  assert.equal(s.years.length, 30);
  close(s.years[29].endingBalance, 0);
  assert.ok(s.years.every((y) => y.endingBalance >= 0));
  close(s.totalInterest, 231676.38, 1);
  close(s.years.reduce((a, y) => a + y.principalPaid, 0), 200000);
  close(s.totalPaid, 200000 + s.totalInterest);
});

test('amortizationSchedule zero rate and fractional years', () => {
  const z = amortizationSchedule(12000, 0, 1);
  assert.equal(z.totalInterest, 0);
  close(z.years[0].endingBalance, 0);
  const f = amortizationSchedule(10000, 5, 2.5);
  assert.equal(f.years.length, 3);
  close(f.years[2].endingBalance, 0);
});

test('compoundGrowth', () => {
  close(
    compoundGrowth({ initial: 10000, monthlyContribution: 0, annualRatePct: 5, years: 10, compoundsPerYear: 1 }).finalBalance,
    16288.95,
  );
  close(
    compoundGrowth({ initial: 1000, monthlyContribution: 0, annualRatePct: 12, years: 1, compoundsPerYear: 12 }).finalBalance,
    1126.83,
  );
  const z = compoundGrowth({ initial: 0, monthlyContribution: 100, annualRatePct: 0, years: 1, compoundsPerYear: 12 });
  close(z.finalBalance, 1200);
  close(z.totalInterest, 0);
  assert.equal(z.years.length, 1);
});

test('compoundGrowth daily compounding stays finite', () => {
  const r = compoundGrowth({ initial: 1000, monthlyContribution: 100, annualRatePct: 100, years: 100, compoundsPerYear: 365 });
  assert.ok(Number.isFinite(r.finalBalance));
});

test('savingsGoalMonthly', () => {
  close(savingsGoalMonthly({ target: 10000, initial: 0, annualRatePct: 0, years: 1 }), 833.33);
  assert.equal(savingsGoalMonthly({ target: 1000, initial: 1000, annualRatePct: 3, years: 5 }), 0);
  const dep = savingsGoalMonthly({ target: 50000, initial: 2000, annualRatePct: 5, years: 8 });
  const g = compoundGrowth({ initial: 2000, monthlyContribution: dep, annualRatePct: 5, years: 8, compoundsPerYear: 12 });
  close(g.finalBalance, 50000, 0.05);
});

test('roi', () => {
  const r = roi({ initial: 1000, final: 2000, years: 10 });
  assert.equal(r.gain, 1000);
  assert.equal(r.roiPct, 100);
  close(r.cagrPct, 7.177, 0.001);
});

test('validate', () => {
  assert.ok(validate({ principal: -5, rate: 5, years: 10 }, loanRules).length > 0);
  assert.ok(validate({ principal: 1000, rate: 5, years: 0 }, loanRules).length > 0);
  assert.ok(validate({ principal: NaN, rate: 5, years: 10 }, loanRules).length > 0);
  assert.ok(validate({ principal: '', rate: 5, years: 10 }, loanRules).length > 0);
  assert.ok(validate({ principal: 1000, rate: 101, years: 10 }, loanRules).length > 0);
  assert.ok(validate({ principal: 1000, rate: 5, years: 101 }, loanRules).length > 0);
  assert.ok(validate({ initial: 0, final: 5, years: 1 }, roiRules).length > 0);
  assert.deepEqual(validate({ principal: '1000', rate: '0', years: '10' }, loanRules), []);
});
