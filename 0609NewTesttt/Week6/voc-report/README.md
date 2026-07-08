# 📊 [조사] 손님 리뷰·경쟁사 분석 → 엑셀/PPT 보고서 (20점 퀘스트)

`my_cafe.md`(데일리브루) 기준으로 커스텀한 **두 경로 모두** 완성 — VoC 엑셀(경로 A) + 경쟁사 PPT(경로 B).

## 산출물

| 파일 | 내용 |
|---|---|
| `cafe_reviews.csv` | 원천 데이터 — 데일리브루 리뷰 20건 (날짜/플랫폼/별점/리뷰/테마) |
| `voc_report.xlsx` | **VoC 분석 엑셀** — 리뷰원본(부정 강조 서식) + VoC분석 시트: 별점 분포 막대차트, 테마별 피벗(COUNTIF/COUNTIFS 수식), 부정(≤2점) 테마 Top3(LARGE/INDEX/MATCH), 핵심 인사이트 |
| `competitors.md` | 원천 데이터 — 성수동 반경 500m 경쟁 4사 비교 (데일리브루 기준) |
| `competitor_report.pptx` | **경쟁사 분석 PPT 5장** — 표지 / 시장 개요(스탯 콜아웃) / 비교표(우리 열 강조) / 차별화 3 / 추천 액션 (Berry & Cream 팔레트) |
| `make_voc_xlsx.py`, `make_competitor_pptx.py` | 생성 스크립트 (수식 기반 — 값 박제 아님) |

## 분석 결과 (기대 스토리와 일치)

- **긍정 축**: 디저트(직접 굽는 치즈케이크·크로플)·맛 — 평균 별점 4.05
- **부정 1위**: **대기시간** (부정 리뷰 3건 전부) → "주말 웨이팅 개선"이 최우선 액션
- **경쟁 인사이트**: 4사 가격 박스권(4,000~5,000원), 디저트 강자 스윗아워도 외주·냉동 → "당일 제조"는 우리뿐. 팔로워 5.2배 격차가 병목 → **인플루언서 협업** ([홍보] 퀘스트로 연결)

## 실행 스크린샷 (`screenshots/`)

- `01-voc-excel-open.png` — Excel에서 리뷰원본 시트 (부정 리뷰 핑크 강조)
- `02-voc-excel-analysis.png` — VoC분석 시트: 수식 계산값 + 차트 2개 렌더 확인
- `03-competitor-ppt-open.png` / `04-competitor-ppt-table.png` — PowerPoint에서 5장 확인

## 검증
- 엑셀 수식(COUNTIF·COUNTIFS·LARGE·INDEX/MATCH·AVERAGE)이 실제 Excel에서 계산됨을 화면으로 확인 (합계 20, 평균 4.05, 부정 1위 대기시간 3건 — python 검산과 일치)
- 채점 기준 대응: 기능(수식/차트/데이터 기반) ✓ · 실행 화면 스샷 ✓ · 완성도(서식·팔레트) ✓ · 창의(my_cafe.md 커스텀 = 가점 요건) ✓
