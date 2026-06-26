# 01_Cafe — 카페 프로젝트 모음

폴더별 정리 구조입니다.

## 📁 00_월별매출현황_원본
처음 만든 월별 매출현황 엑셀 샘플 (document-skills `xlsx`).
- `월별매출현황.xlsx` · `screenshot-table.png` · `screenshot-chart.png` · `command-input.txt` · `README.md`

## 📁 01_브랜드키트 — QUARTER
블랙·스테인리스 메탈 미니멀 카페 "QUARTER" 브랜드 자산.
- `my_cafe.md` (컨셉), `quarterly_calendar.md` (분기 운영 캘린더)
- `menu.html` / `logo.html` / `profile.html` / `render.html` + 각 스크린샷
- `profile_1080_*.png` (인스타 프로필 1080 추출본 3종)

## 📁 02_매출보고서_QUARTER
2026 상반기(1~6월) 매출 보고서 4종 + 코멘트.
- `QUARTER_월별매출.xlsx` (네이티브 차트)
- `QUARTER_카페소개.docx` / `.pdf` / `.pptx`
- `chart_sales.png` · `chart_donut.png` · `월매출_코멘트_2-5월.md`

## 📁 03_1분기실적_하버카페
하버 카페 2026 1분기(3~5월) 손익 분석 + 보고서.
- `cafe_q1.csv` (거래 원본), `cafe_q1_손익리포트.xlsx` (SUMIFS·피벗·차트)
- `cafe_report.md` (보고서 본문), `하버카페_1분기보고.pptx` (5장 PPT)
- `chart_q1_profit.png` · `chart_q1_category.png`

## 📁 04_웹사이트 — QUARTER
QUARTER 컨셉 기반 카페 공식 웹사이트 UI (단일 `index.html`, CDN React+Tailwind, 다크 글래시).
- 홈 / 메뉴 / 이벤트 / 예약(localStorage 게시판) / 오시는 길(구글맵+네이버지도)
- 네이버 지도·인스타그램·스레드 아이콘
- 실행: `cd 04_웹사이트 && python3 -m http.server 8000` → http://localhost:8000/
- 자세한 내용은 `04_웹사이트/README.md`
