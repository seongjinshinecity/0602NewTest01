// ============================================================
// 익명 연봉/지출 비교 — Express 서버 (REST API)
// ------------------------------------------------------------
//  · 익명으로 월급 / 월 지출(카테고리별) / 직군 / 연차 제출
//  · 전체 평균, 월급 분포, 내 위치(상위 %) 계산
//  · 카테고리별 평균 지출 비교
//  · 모든 제출은 DB(PostgreSQL: PGlite/Supabase)에 익명으로 저장됩니다.
// ============================================================

try { process.loadEnvFile(); } catch { /* .env 없음 */ }

const express = require('express');
const path = require('path');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ----- 도메인 상수 -----
const JOBS = ['dev', 'design', 'pm', 'marketing', 'sales', 'etc'];

// 지출 카테고리: DB 컬럼명 ↔ 표시 라벨
const CATEGORIES = [
  { key: 'food',         col: 'exp_food',         label: '식비' },
  { key: 'housing',      col: 'exp_housing',      label: '주거' },
  { key: 'transport',    col: 'exp_transport',    label: '교통' },
  { key: 'telecom',      col: 'exp_telecom',      label: '통신' },
  { key: 'subscription', col: 'exp_subscription', label: '구독료' },
  { key: 'leisure',      col: 'exp_leisure',      label: '여가' },
  { key: 'etc',          col: 'exp_etc',          label: '기타' },
];

// 월급 분포 히스토그램 구간 (만원). [min, max) — 마지막은 상한 없음.
const SALARY_BUCKETS = [
  { label: '~200',     min: 0,    max: 200 },
  { label: '200~300',  min: 200,  max: 300 },
  { label: '300~400',  min: 300,  max: 400 },
  { label: '400~500',  min: 400,  max: 500 },
  { label: '500~700',  min: 500,  max: 700 },
  { label: '700~1000', min: 700,  max: 1000 },
  { label: '1000~',    min: 1000, max: Infinity },
];

// ----- 입력 정리 -----
const toInt = (v, max = 100000) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
};
const normJob = (v) => (JOBS.includes(v) ? v : 'etc');

function rowExpenseTotal(r) {
  return CATEGORIES.reduce((s, c) => s + (r[c.col] || 0), 0);
}

// 행 배열 → 통계 객체
function buildStats(rows) {
  const count = rows.length;
  if (count === 0) {
    return {
      count: 0,
      salary: { avg: 0, median: 0, min: 0, max: 0, distribution: SALARY_BUCKETS.map((b) => ({ label: b.label, count: 0 })) },
      expense: { avgTotal: 0, byCategory: CATEGORIES.map((c) => ({ key: c.key, label: c.label, avg: 0 })) },
      savingsRate: 0,
    };
  }

  const salaries = rows.map((r) => r.salary).sort((a, b) => a - b);
  const sum = (arr) => arr.reduce((s, x) => s + x, 0);
  const avg = (arr) => Math.round(sum(arr) / arr.length);
  const median = (() => {
    const m = Math.floor(salaries.length / 2);
    return salaries.length % 2 ? salaries[m] : Math.round((salaries[m - 1] + salaries[m]) / 2);
  })();

  const distribution = SALARY_BUCKETS.map((b) => ({
    label: b.label,
    count: rows.filter((r) => r.salary >= b.min && r.salary < b.max).length,
  }));

  const byCategory = CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    avg: avg(rows.map((r) => r[c.col] || 0)),
  }));

  const totals = rows.map(rowExpenseTotal);
  const avgTotal = avg(totals);

  // 저축률 = (월급 - 총지출) / 월급, 0~100% 로 보정한 뒤 평균
  const rates = rows.map((r) => {
    if (r.salary <= 0) return 0;
    return Math.max(0, Math.min(100, ((r.salary - rowExpenseTotal(r)) / r.salary) * 100));
  });
  const savingsRate = Math.round(sum(rates) / rates.length);

  return {
    count,
    salary: { avg: avg(salaries), median, min: salaries[0], max: salaries[salaries.length - 1], distribution },
    expense: { avgTotal, byCategory },
    savingsRate,
  };
}

// 내 위치: 월급 기준 상위 몇 % (값이 클수록 상위)
function salaryPercentile(rows, mySalary) {
  const count = rows.length;
  if (count <= 1) return 1; // 표본이 나뿐이면 상위 1%로 표시
  const higher = rows.filter((r) => r.salary > mySalary).length;
  // 상위 N% = 나보다 많이 버는 사람 비율. 최소 1%, 최대 99%.
  return Math.max(1, Math.min(99, Math.round((higher / count) * 100)));
}

async function fetchRows(job) {
  if (job && JOBS.includes(job)) {
    const { rows } = await query('SELECT * FROM submissions WHERE job = $1', [job]);
    return rows;
  }
  const { rows } = await query('SELECT * FROM submissions', []);
  return rows;
}

// ============================================================
//  통계 조회 — ?job=dev|design|...(선택, 직군 필터)
// ============================================================
app.get('/api/stats', async (req, res) => {
  try {
    const job = req.query.job;
    const rows = await fetchRows(job);
    res.json({ success: true, data: buildStats(rows), meta: { categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label })), jobs: JOBS } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '통계를 불러오지 못했습니다.' });
  }
});

// ============================================================
//  제출 — 익명으로 한 건 저장하고, 전체 통계 + 내 위치를 돌려줌
// ============================================================
app.post('/api/submissions', async (req, res) => {
  const b = req.body || {};
  const job = normJob(b.job);
  const years = toInt(b.years, 60);
  const salary = toInt(b.salary, 100000);
  if (salary <= 0) return res.status(400).json({ success: false, message: '월급을 입력해 주세요.' });

  const exp = Object.fromEntries(CATEGORIES.map((c) => [c.col, toInt(b[c.key], 100000)]));

  try {
    await query(
      `INSERT INTO submissions
         (job, years, salary, exp_food, exp_housing, exp_transport, exp_telecom, exp_subscription, exp_leisure, exp_etc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [job, years, salary, exp.exp_food, exp.exp_housing, exp.exp_transport, exp.exp_telecom, exp.exp_subscription, exp.exp_leisure, exp.exp_etc]
    );

    const allRows = await fetchRows(null);
    const jobRows = allRows.filter((r) => r.job === job);

    const myExpenseTotal = CATEGORIES.reduce((s, c) => s + toInt(b[c.key], 100000), 0);
    const mySavingsRate = salary > 0 ? Math.max(0, Math.min(100, Math.round(((salary - myExpenseTotal) / salary) * 100))) : 0;

    res.status(201).json({
      success: true,
      data: {
        stats: buildStats(allRows),
        jobStats: buildStats(jobRows),
        me: {
          job, years, salary,
          expenses: Object.fromEntries(CATEGORIES.map((c) => [c.key, toInt(b[c.key], 100000)])),
          expenseTotal: myExpenseTotal,
          savingsRate: mySavingsRate,
          percentileAll: salaryPercentile(allRows, salary),
          percentileJob: salaryPercentile(jobRows, salary),
        },
      },
      meta: { categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label })), jobs: JOBS },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '제출 저장에 실패했습니다.' });
  }
});

// ----- SPA fallback -----
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ 익명 연봉/지출 비교 실행 중 · http://localhost:${PORT}`));
}
module.exports = app;
