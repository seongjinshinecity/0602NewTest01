#!/usr/bin/env python3
"""인게이지먼트율 계산 + 적합도 점수 보조.
실제 화면에서 확인한 공개 수치를 입력하면 율/등급을 계산한다.
(데이터를 수집하지 않는다 — 사람이 본 값을 넣는 도구일 뿐)

사용:
  python3 engagement.py <팔로워> <평균좋아요> <평균댓글>
예:
  python3 engagement.py 8200 540 31
"""
import sys


def engagement_rate(followers, avg_likes, avg_comments):
    if followers <= 0:
        raise ValueError("팔로워 수는 0보다 커야 합니다")
    return (avg_likes + avg_comments) / followers * 100


def er_grade(er):
    if er >= 6:
        return "우수", 35
    if er >= 3:
        return "양호", 25
    if er >= 1:
        return "보통", 12
    return "낮음", 0


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    followers = float(sys.argv[1])
    avg_likes = float(sys.argv[2])
    avg_comments = float(sys.argv[3])
    er = engagement_rate(followers, avg_likes, avg_comments)
    grade, pts = er_grade(er)
    print(f"팔로워 {followers:,.0f} / 평균 좋아요 {avg_likes:,.0f} / 평균 댓글 {avg_comments:,.0f}")
    print(f"인게이지먼트율 = ({avg_likes:,.0f}+{avg_comments:,.0f}) / {followers:,.0f} × 100 = {er:.2f}%")
    print(f"등급: {grade} (적합도 인게이지먼트 항목 {pts}/35점)")
    if er < 1:
        print("⚠️ 반응률이 매우 낮음 — 가짜 팔로워 의심, 제외 검토")


if __name__ == "__main__":
    main()
