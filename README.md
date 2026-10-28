# FinCalc – Financial Calculators

A small static website with four financial calculators. Plain HTML, CSS and JavaScript: no framework, no build step, no dependencies.

## Calculators

1. **Loan / Mortgage** – monthly payment, total paid, total interest and a yearly amortization table.
2. **Compound Interest** – growth with an initial deposit and monthly contributions (annual, quarterly, monthly or daily compounding) with a yearly growth table.
3. **Savings Goal** – the monthly deposit needed to reach a target.
4. **ROI / CAGR** – total return and compound annual growth rate.

A currency picker (USD, EUR, GBP, INR, BDT) changes how amounts are displayed; it does not convert values.

## Formulas

Rates are annual percentages. `r = rate/100/12`, `n = round(years × 12)` (at least 1).

- **Loan payment:** `P·r / (1 − (1+r)^−n)`; if the rate is 0, `P / n`. The amortization table is stepped month by month and the last month clears the balance to exactly 0.
- **Compound interest:** effective monthly rate `i = (1 + rate/100/m)^(m/12) − 1` where `m` is compounds per year. Each month: `balance = balance·(1+i) + contribution` (contribution at month end).
- **Savings goal:** with `i = rate/100/12`, `FV₀ = initial·(1+i)^n`; deposit = `(target − FV₀)·i / ((1+i)^n − 1)`; `0` if `FV₀ ≥ target`; `(target − initial)/n` if the rate is 0.
- **ROI:** `(final − initial)/initial × 100`. **CAGR:** `((final/initial)^(1/years) − 1) × 100`.

All math lives in `js/finance.js` (pure functions, no DOM). It is a classic script that exposes its API as `window.FinCalc` (`globalThis.FinCalc` in Node), so the site works without a server.

## Run

Just open `index.html` in a browser (double-click). No server needed.

Optionally run `npm start` and visit <http://localhost:8080>.

## Test

```
npm test
```

Uses Node's built-in test runner (Node 20+) on `tests/finance.test.js`.

## Disclaimer

Estimates only, not financial advice.
