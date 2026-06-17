import json
import os
import zipfile

# 50 ingredients list from the previous response
ingredients = [
    {"id": 1, "name": "대파", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장 또는 냉동", "usage": "찌개, 볶음 등 모든 요리의 기본"},
    {"id": 2, "name": "양파", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장 또는 실온", "usage": "단맛을 내는 필수 채소"},
    {"id": 3, "name": "마늘", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장 또는 냉동", "usage": "다진 마늘 또는 통마늘"},
    {"id": 4, "name": "감자", "category": "신선칸 (야채 및 과일)", "recommended_storage": "실온 또는 냉장", "usage": "구이, 조림, 국거리용"},
    {"id": 5, "name": "당근", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "색감과 아삭한 식감용"},
    {"id": 6, "name": "애호박", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "된장찌개나 전 필수템"},
    {"id": 7, "name": "무", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "시원한 국물 요리용"},
    {"id": 8, "name": "청양고추 / 홍고추", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장 또는 냉동", "usage": "매콤한 칼칼함 추가"},
    {"id": 9, "name": "팽이버섯 / 새송이버섯", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "쫄깃한 식감"},
    {"id": 10, "name": "양배추", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "쌈이나 샐러드, 볶음용"},
    {"id": 11, "name": "상추 / 깻잎", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "고기 먹다 남은 쌈채소"},
    {"id": 12, "name": "토마토", "category": "신선칸 (야채 및 과일)", "recommended_storage": "실온 또는 냉장", "usage": "달걀과 볶아 먹기 좋은 과채류"},
    {"id": 13, "name": "사과", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "아침 대용 또는 샐러드용"},
    {"id": 14, "name": "레몬", "category": "신선칸 (야채 및 과일)", "recommended_storage": "냉장", "usage": "하이볼, 에이드 또는 생선 비린내 제거용"},
    {"id": 15, "name": "달걀", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장", "usage": "냉장고의 완벽한 필수품"},
    {"id": 16, "name": "두부", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장", "usage": "찌개, 부침용"},
    {"id": 17, "name": "국물용 멸치 / 다시마", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장 또는 냉동", "usage": "육수 베이스"},
    {"id": 18, "name": "우유", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장", "usage": "라떼나 시리얼용"},
    {"id": 19, "name": "요거트", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장", "usage": "간식 또는 드레싱용"},
    {"id": 20, "name": "체다 치즈 / 모짜렐라 치즈", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장", "usage": "떡볶이나 토스트용"},
    {"id": 21, "name": "어묵", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장 또는 냉동", "usage": "어묵볶음이나 탕용"},
    {"id": 22, "name": "크래미 / 맛살", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장", "usage": "볶음밥이나 전용"},
    {"id": 23, "name": "베이컨", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장 또는 냉동", "usage": "파스타나 브런치용"},
    {"id": 24, "name": "슬라이스 햄", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장 또는 냉동", "usage": "샌드위치용"},
    {"id": 25, "name": "김치", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장 (김치냉장고)", "usage": "배추김치, 총각김치 등"},
    {"id": 26, "name": "밑반찬", "category": "냉장실 메인 (단백질 및 반찬류)", "recommended_storage": "냉장", "usage": "멸치볶음, 진미채, 장조림 등"},
    {"id": 27, "name": "간장", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "실온 또는 냉장", "usage": "진간장 또는 국간장"},
    {"id": 28, "name": "고추장", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장", "usage": "찌개, 볶음, 비빔 요리"},
    {"id": 29, "name": "된장", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장", "usage": "국, 찌개, 나물 무침"},
    {"id": 30, "name": "쌈장", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장", "usage": "고기 구워 먹고 남은 것"},
    {"id": 31, "name": "굴소스", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장", "usage": "볶음요리의 만능 치트키"},
    {"id": 32, "name": "케첩", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장", "usage": "디핑 소스 및 요리 양념"},
    {"id": 33, "name": "마요네즈", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장 (서늘한 곳)", "usage": "샐러드 및 소스 베이스"},
    {"id": 34, "name": "머스터드 소스", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장", "usage": "튀김 및 고기 소스"},
    {"id": 35, "name": "새우젓", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장 또는 냉동", "usage": "계란찜이나 국물 간 맞추기용"},
    {"id": 36, "name": "버터", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장 또는 냉동", "usage": "구이 및 베이킹용"},
    {"id": 37, "name": "들기름 / 참기름", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "들기름은 냉장 / 참기름은 실온", "usage": "요리 마무리 및 무침용"},
    {"id": 38, "name": "잼", "category": "소스 및 양념류 (문쪽 칸)", "recommended_storage": "냉장", "usage": "딸기잼, 블루베리잼 등"},
    {"id": 39, "name": "냉동 만두", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "야식 및 떡만둣국용"},
    {"id": 40, "name": "대패삼겹살 / 차돌박이", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "빨리 익어 요리하기 편한 고기"},
    {"id": 41, "name": "닭가슴살", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "식단 관리 또는 샐러드 토핑용"},
    {"id": 42, "name": "국거리용 소고기 / 돼지고기", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "찌개 및 국물 요리용"},
    {"id": 43, "name": "냉동 새우", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "파스타, 감바스, 볶음밥용"},
    {"id": 44, "name": "오징어", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "해물파전이나 찌개용"},
    {"id": 45, "name": "피자 치즈", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "대용량 보관용"},
    {"id": 46, "name": "떡볶이 떡 / 떡국 떡", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "간식 및 떡국용"},
    {"id": 47, "name": "식빵", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "먹다 남겨 얼려둔 것"},
    {"id": 48, "name": "냉동 대파", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "미리 썰어서 얼려둔 것"},
    {"id": 49, "name": "다진 마늘 큐브", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "요리할 때 하나씩 쏙"},
    {"id": 50, "name": "얼음", "category": "냉동실 (장기 보관류)", "recommended_storage": "냉동", "usage": "아이스 커피 및 음료용"}
]

# Create individual JSON files and package them into a zip file
zip_filename = 'refrigerator_ingredients.zip'

with zipfile.ZipFile(zip_filename, 'w') as csv_zip:
    for idx, item in enumerate(ingredients, 1):
        # Create a clean filename based on ID and name (replace slashes to avoid folder paths)
        safe_name = item['name'].replace(' / ', '_').replace('/', '_')
        json_filename = f"ingredient_{idx:02d}_{safe_name}.json"
        
        # Convert item dict to formatted JSON string with UTF-8 encoding support
        json_data = json.dumps(item, ensure_ascii=False, indent=4)
        
        # Write to zip directly
        csv_zip.writestr(json_filename, json_data)

print(f"Successfully created {zip_filename}")