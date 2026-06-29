# DEMO — 가계부 소비 분석가 (실제 에이전트 실행 기록)

> 아래는 `gyebu-analyst` 에이전트를 **실제로 띄워 Supabase `transactions`(204행)에 직접 쿼리**하게 한 결과다.
> 모든 수치는 에이전트가 실행한 SQL 결과이며, 사람이 손으로 적은 값이 아니다. (조회 / 패턴 분석 / 절약 조언 3종 포함)

---

## 가계부 소비 분석 리포트

Supabase `public.transactions` 테이블만 봤다(다른 테이블은 건드리지 않음). 데이터 기간은 **2026-03-01 ~ 2026-06-26**, 총 **204행**(지출 200, 수입 4)이고 지출 카테고리는 식비·교통·문화·구독료·의료·주거·경조사 7종이다. "최근 달"은 데이터의 최신 달인 **2026년 6월**로 해석했다.

### Q1. 가장 최근 달(2026-06)에 총 얼마 썼어(지출)? 수입은?
- **실행 쿼리**: `SELECT SUM(amount) FILTER (WHERE type='expense') AS total_expense, SUM(amount) FILTER (WHERE type='income') AS total_income FROM public.transactions WHERE date >= '2026-06-01' AND date < '2026-07-01';`
- **결과**: 지출 1,169,026원 / 수입 3,000,000원
- **답변**: 6월은 지출 1,169,026원, 수입 3,000,000원으로 약 183만원이 남았다. 수입 대비 지출률은 39% 수준이라 흑자 폭은 양호하다.

### Q2. 식비로 가장 많이 쓴 날과 금액은?
- **실행 쿼리**: `SELECT date, SUM(amount) AS day_total FROM public.transactions WHERE type='expense' AND category='식비' GROUP BY date ORDER BY day_total DESC LIMIT 1;`
- **결과**: 2026-05-09, 27,054원
- **답변**: 식비 최고 지출일은 5월 9일(토)로 하루 27,054원을 썼다. 주말 외식·모임에서 식비가 몰리는 패턴으로 보인다.

### Q3. 교통비 월평균은?
- **실행 쿼리**: `WITH m AS (SELECT date_trunc('month', date) AS mon, SUM(amount) AS monthly FROM public.transactions WHERE type='expense' AND category='교통' GROUP BY 1) SELECT ROUND(AVG(monthly)) AS avg_monthly_transport, COUNT(*) AS months FROM m;`
- **결과**: 월평균 71,575원 (4개월 기준)
- **답변**: 교통비는 월평균 71,575원이다. 전체 지출에서 비중이 크지 않은 고정성 비용이라 절감 여지는 작다.

### Q4. 카테고리별 지출 비율 Top5는? (최근 달 2026-06)
- **실행 쿼리**: `SELECT category, SUM(amount) AS cat_total, ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS pct FROM public.transactions WHERE type='expense' AND date >= '2026-06-01' AND date < '2026-07-01' GROUP BY category ORDER BY cat_total DESC LIMIT 5;`
- **결과**:
  1. 주거 550,000원 (47.0%)
  2. 식비 338,040원 (28.9%)
  3. 문화 144,929원 (12.4%)
  4. 의료 80,457원 (6.9%)
  5. 교통 38,600원 (3.3%)
- **답변**: 6월 지출의 절반(47.0%)이 주거(월세성 고정비), 그다음이 식비 28.9%다. 고정비를 빼면 사실상 식비가 변동 지출의 핵심이다.

### Q5. 주중 vs 주말 하루 평균 지출 차이는?
- **실행 쿼리**: `WITH daily AS (SELECT date, CASE WHEN EXTRACT(DOW FROM date) IN (0,6) THEN 'weekend' ELSE 'weekday' END AS daytype, SUM(amount) AS day_total FROM public.transactions WHERE type='expense' GROUP BY date) SELECT daytype, ROUND(AVG(day_total)) AS avg_per_day, COUNT(*) AS num_days FROM daily GROUP BY daytype;`
- **결과**: 주중 36,515원/일 (84일) · 주말 55,819원/일 (33일)
- **답변**: 주말 하루 평균이 55,819원으로 주중(36,515원)보다 19,304원, 약 1.5배 많다. 지출이 주말에 집중되는 전형적인 패턴이다.

### Q6. 월별 지출 추세는?
- **실행 쿼리**: `SELECT to_char(date_trunc('month', date), 'YYYY-MM') AS month, SUM(amount) AS monthly_expense FROM public.transactions WHERE type='expense' GROUP BY 1 ORDER BY 1;`
- **결과**: 2026-03 1,196,084원 → 2026-04 1,317,241원 → 2026-05 1,226,959원 → 2026-06 1,169,026원
- **답변**: 4월에 정점(1,317,241원)을 찍고 5월·6월 연속 감소해 6월이 4개월 중 가장 낮다. 전반적으로 지출이 안정·하향 추세다(단, 6월은 26일까지 데이터라 월말 일부가 빠졌을 수 있다).

### Q7. 데이터상 가장 줄일 만한 카테고리 한 개와 근거는?
- **실행 쿼리**: `SELECT to_char(date_trunc('month', date),'YYYY-MM') AS month, SUM(amount) AS food_total, COUNT(*) AS cnt, ROUND(AVG(amount)) AS avg_per_tx FROM public.transactions WHERE type='expense' AND category='식비' GROUP BY 1 ORDER BY 1;`
- **결과**: 03 318,859원(26건) / 04 404,989원(28건) / 05 418,354원(29건) / 06 338,040원(25건), 건당 평균 약 12,000~14,500원
- **답변**: 가장 줄일 만한 건 **식비**다. 6월 변동 지출 1위(338,040원, 전체의 28.9%)이고 월 25~29건으로 가장 빈도가 높아 통제 여지가 크다. 주거(47%)는 1건짜리 고정비라 단기 절감이 어려운 반면, 식비는 건당 1만원대 소액 결제가 쌓이는 구조라 줄이기 쉽다.

### Q8. 이번 달(2026-06) 소비 패턴 한 줄 진단 + 실행 가능한 제안 1개
- **실행 쿼리**: Q1·Q4·Q5의 결과 활용 (`SUM(amount) FILTER (...)`, 카테고리별 비율, 주중/주말 일평균)
- **결과**: 6월 지출 1,169,026원(수입의 39%), 고정비 주거 47% + 식비 28.9%, 주말 일평균 55,819원(주중의 약 1.5배)
- **답변**: 수입 대비 지출은 안정적이지만 변동비가 식비와 주말에 쏠려 있다. **제안:** 주말 식비에 1일 4만원 상한을 정하면(현재 주말 평균 55,819원 → 36,515원의 주중 수준) 주말 8~9일 기준 월 약 12~15만원을 더 아낄 수 있다.
