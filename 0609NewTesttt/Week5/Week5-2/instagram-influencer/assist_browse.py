#!/usr/bin/env python3
"""인플루언서 탐색 '보기 보조' 스크립트 (반자동).

이 스크립트가 하는 일 / 하지 않는 일:
  ✅ 사용자가 이미 로그인한 크롬에서 해시태그 탐색 페이지를 한 번에 하나씩 열어준다.
  ❌ 자동 스크래핑(좋아요/팔로워 일괄 수집) 안 함.
  ❌ 자동 DM / 팔로우 / 좋아요 안 함.
  ❌ 비밀번호·세션 저장 안 함.

데이터(팔로워·좋아요·댓글)는 사람이 화면을 보고 influencers.template.md에 직접 적는다.
한 명씩 천천히 보는 것이 목적 — 인스타 정책·계정 안전을 지키기 위함.

사전 준비 (사용자가 직접):
  1) 크롬을 디버그 모드로 띄우고 본인 인스타에 로그인해 둔다.
       (예: 새 크롬 프로파일에서 인스타 로그인 후)
  2) pip install playwright 후 playwright install chromium (또는 channel='chrome')
  3) python3 assist_browse.py

이 저장소 환경에서는 '본인 로그인'이 없으므로 실행하지 않는다(스크립트 제공만).
"""
import time

HASHTAGS = [
    "성수동카페", "성수디저트", "성수동맛집",
    "서울디저트", "성수카페추천", "치즈케이크맛집",
]
PAUSE_SEC = 25  # 한 페이지를 사람이 충분히 볼 시간


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright 미설치. `pip install playwright && playwright install chromium` 후 실행하세요.")
        return

    print("⚠️ 시작 전 확인: 본인 인스타에 로그인된 상태여야 합니다(비밀번호는 이 스크립트에 넣지 않음).")
    print(f"{len(HASHTAGS)}개 해시태그를 한 번에 하나씩 엽니다. 각 {PAUSE_SEC}초간 사람이 후보를 눈으로 고르세요.\n")

    with sync_playwright() as p:
        # 본인이 로그인한 크롬 사용 (channel='chrome'). headless=False = 사람이 직접 봄.
        browser = p.chromium.launch(channel="chrome", headless=False)
        page = browser.new_page()
        for tag in HASHTAGS:
            url = f"https://www.instagram.com/explore/tags/{tag}/"
            print(f"→ #{tag} 열기: {url}  (브라우저에서 후보를 골라 메모하세요)")
            page.goto(url)
            time.sleep(PAUSE_SEC)  # 자동 수집 아님 — 사람이 보는 시간
        print("\n완료. 고른 후보의 팔로워/좋아요/댓글을 influencers.template.md에 직접 입력하세요.")
        print("그다음: python3 engagement.py <팔로워> <평균좋아요> <평균댓글>")
        browser.close()


if __name__ == "__main__":
    main()
