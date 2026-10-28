(function () {
  'use strict';

  const {
    amortizationSchedule,
    compoundGrowth,
    savingsGoalMonthly,
    roi,
    validate,
    loanRules,
    compoundRules,
    savingsRules,
    roiRules,
  } = window.FinCalc;

  const $ = (sel, root = document) => root.querySelector(sel);

  const currencySelect = $('#currency');
  let moneyFmt;
  const pctFmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function updateFormatter() {
    moneyFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: currencySelect.value });
  }
  const money = (v) => moneyFmt.format(v);
  const pct = (v) => `${pctFmt.format(v)}%`;

  // ---------- helpers ----------
  function readForm(form) {
    const values = {};
    for (const el of form.elements) {
      if (el.name) values[el.name] = el.value;
    }
    return values;
  }

  function showErrors(id, errors) {
    const box = $(`#errors-${id}`);
    box.replaceChildren();
    if (errors.length) {
      const ul = document.createElement('ul');
      for (const e of errors) {
        const li = document.createElement('li');
        li.textContent = e;
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
  }

  function setValues(id, map) {
    const root = $(`#results-${id}`);
    for (const [key, text] of Object.entries(map)) {
      $(`[data-key="${key}"]`, root).textContent = text;
    }
  }

  function fillTable(table, rows) {
    const tbody = $('tbody', table);
    tbody.replaceChildren();
    for (const cells of rows) {
      const tr = document.createElement('tr');
      for (const text of cells) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  // ---------- calculators ----------
  // Each calculator keeps the latest computed result so currency changes can re-render it.
  const calculators = {
    loan: {
      rules: loanRules,
      compute(v) {
        return amortizationSchedule(Number(v.principal), Number(v.rate), Number(v.years));
      },
      render(r) {
        setValues('loan', {
          payment: money(r.payment),
          totalPaid: money(r.totalPaid),
          totalInterest: money(r.totalInterest),
        });
        fillTable($('#table-loan'), r.years.map((y) => [
          String(y.year), money(y.principalPaid), money(y.interestPaid), money(y.endingBalance),
        ]));
      },
    },
    compound: {
      rules: compoundRules,
      compute(v) {
        return compoundGrowth({
          initial: Number(v.initial),
          monthlyContribution: Number(v.monthly),
          annualRatePct: Number(v.rate),
          years: Number(v.years),
          compoundsPerYear: Number(v.freq),
        });
      },
      render(r) {
        setValues('compound', {
          finalBalance: money(r.finalBalance),
          totalContributions: money(r.totalContributions),
          totalInterest: money(r.totalInterest),
        });
        fillTable($('#table-compound'), r.years.map((y) => [
          String(y.year), money(y.balance), money(y.contributions), money(y.interest),
        ]));
      },
    },
    savings: {
      rules: savingsRules,
      compute(v) {
        const target = Number(v.target);
        const initial = Number(v.initial);
        const rate = Number(v.rate);
        const years = Number(v.years);
        const monthly = savingsGoalMonthly({ target, initial, annualRatePct: rate, years });
        const months = Math.max(1, Math.round(years * 12));
        const deposited = monthly * months;
        const fvInitial = initial * (1 + rate / 100 / 12) ** months;
        // Already reached: interest is the initial amount's own growth.
        // Otherwise it is the growth needed beyond what is contributed.
        const interest = monthly === 0
          ? Math.max(0, fvInitial - initial)
          : Math.max(0, target - initial - deposited);
        return { monthly, deposited, interest, reached: monthly === 0 };
      },
      render(r) {
        setValues('savings', {
          monthly: money(r.monthly),
          deposited: money(r.deposited),
          interest: money(r.interest),
        });
        $('#note-savings').hidden = !r.reached;
      },
    },
    roi: {
      rules: roiRules,
      compute(v) {
        return roi({ initial: Number(v.initial), final: Number(v.final), years: Number(v.years) });
      },
      render(r) {
        setValues('roi', {
          roiPct: pct(r.roiPct),
          gain: money(r.gain),
          cagrPct: pct(r.cagrPct),
        });
      },
    },
  };

  const latest = {};

  function run(id) {
    const calc = calculators[id];
    const form = $(`#form-${id}`);
    const results = $(`#results-${id}`);
    const values = readForm(form);
    const errors = validate(values, calc.rules);
    showErrors(id, errors);
    if (errors.length) {
      delete latest[id];
      results.hidden = true;
      return;
    }
    const result = calc.compute(values);
    latest[id] = result;
    calc.render(result);
    results.hidden = false;
  }

  for (const id of Object.keys(calculators)) {
    $(`#form-${id}`).addEventListener('submit', (e) => {
      e.preventDefault();
      run(id);
    });
  }

  currencySelect.addEventListener('change', () => {
    updateFormatter();
    for (const [id, calc] of Object.entries(calculators)) {
      if (latest[id]) calc.render(latest[id]);
    }
  });

  // ---------- tabs ----------
  const tabs = [...document.querySelectorAll('[role="tab"]')];

  function selectTab(tab) {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
    }
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      let next;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        next.focus();
        selectTab(next);
      }
    });
  });

  // ---------- init ----------
  updateFormatter();
  for (const id of Object.keys(calculators)) run(id);
})();
