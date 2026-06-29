# 📊 리뷰·경쟁사 → 엑셀/PPT 보고서 (review-report) — 배치3 [조사, 20점]

샘플 데이터를 회의에 바로 들고 갈 **.xlsx / .pptx 보고서**로 변환. 두 경로 모두 구현했다.

## 경로 A — 리뷰(VoC) → 엑셀
- 원천: `cafe_reviews.csv` (날짜·플랫폼·별점·리뷰·테마, 20행)
- 생성기: `make_voc_xlsx.py` → `out/voc_analysis.xlsx`
- 내용: 5개 시트(요약/리뷰원본/별점분포/테마피벗/부정Top3), **별점 분포 막대+파이 차트**, 테마 피벗, **부정 리뷰(별점≤2) 테마 Top3**, 헤더/서식.
- 결과 인사이트: 평균 별점 3.45, **부정 1위 = '대기시간'(3건)** → "웨이팅 개선"을 가리킴.

## 경로 B — 경쟁사 → PPT
- 원천: `competitors.md` (시장개요/비교표/분석/차별화/추천)
- 생성기: `make_competitor_pptx.py` → `out/competitor_analysis.pptx`
- 5슬라이드: 표지 / 시장 개요 / **경쟁사 비교표(데일리브루·어반로스터스·슈가힐·모닝릿)** / 자사 차별화 / 추천 액션.
- 추천에 **'로컬 마이크로 인플루언서 협업'** 포함 → 배치3-3(홍보)과 연결.

## 실행
```bash
cd review-report
python3 make_voc_xlsx.py        # → out/voc_analysis.xlsx
python3 make_competitor_pptx.py # → out/competitor_analysis.pptx
```
의존성: `openpyxl`, `python-pptx` (설치 확인됨).

## 스크린샷 (이번 세션에 실제 재생성·열어서 캡처)
- `screenshots/01-voc-xlsx-charts.png` — voc_analysis.xlsx 를 **Numbers로 열어** 별점 분포 막대·파이 차트 + 테이블 표시.
- `screenshots/02-voc-xlsx-summary.png` — 요약 시트(5개 시트 탭 확인).
- `screenshots/03-competitor-pptx.png` — competitor_analysis.pptx 5슬라이드(경쟁사 비교표·추천 액션 포함). *python-pptx로 읽어 렌더한 미리보기 — 네이티브 앱 캡처 시 개인 창이 섞여 깨끗한 렌더로 대체.*

## 출처
샘플 데이터(`cafe_reviews.csv`, `competitors.md`)·생성 스크립트는 Week5-1 참고본에서 이식, **xlsx/pptx 산출물은 이번 세션에 스크립트로 재생성하고 열어서 확인**했다.
