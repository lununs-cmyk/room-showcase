# Room Showcase v4

세 가지 방 형식과 최대 5장 이미지 업로드를 지원합니다.

- 제한 채팅형: 이미지 최대 5장 + 제한형 1:1 채팅
- 카메라 셔터형: 이미지 최대 5장 + 셔터/플래시/전환/원본 저장
- SNS 피드형: 이미지 최대 5장 + 캐러셀/좋아요/본문
- 이미지 한 장 최대 25MB
- 원본은 R2, 메타데이터는 D1에 저장

## 기존 프로젝트 업그레이드

1. 이 ZIP의 내용물을 GitHub 저장소 루트에 덮어쓰고 커밋합니다.
2. Cloudflare D1 Console에서 `migrations/0005_room_types_and_multi_images.sql`의 SQL을 위에서부터 **한 문장씩** 실행합니다.
3. 기존 바인딩을 확인합니다.
   - D1: `DB`
   - R2: `IMAGES`
   - Secret: `ADMIN_PASSWORD`
4. Pages 프로젝트를 재배포합니다.
5. `/admin/`에서 형식을 선택해 방을 만듭니다.

## 새로 설치

D1에 `migrations/0001_initial.sql` 전체를 실행하고 위 바인딩 3개를 설정합니다.

## 주의

- `ALTER TABLE ... already exists` 오류는 해당 열이 이미 있다는 뜻이므로 다음 문장으로 넘어가면 됩니다.
- 기존 v3 단일 이미지는 마이그레이션 마지막 INSERT가 `room_images`로 복사합니다.
- R2 버킷은 Public으로 열 필요가 없습니다.
