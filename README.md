# Pengrestaurant

내가 다녀온 식당을 지도 위에 별점과 리뷰로 정리하는 개인용 아카이브 앱입니다.

## 포함 기능

- 지도 위 요약 팝업: 식당 이름, 총 별점
- 상세 패널: 주소, 총 별점, 맛, 위생/청결, 디자인, 서비스, 한줄평, 메뉴/가격
- 어드민 모드: 비밀번호 입력 후 리뷰 추가/수정/삭제
- 필터: 행정구역 3단계, 총 별점, 맛, 위생/청결, 디자인, 서비스
- 정렬: 이름순, 총 별점순, 맛 별점순, 위생/청결 별점순, 디자인 별점순, 서비스 별점순
- 모바일 UI: 네이버 지도 스타일의 바텀시트
- 지도: 네이버 지도 우선, 키가 없으면 OpenStreetMap 대체 지도
- DB: 로컬/운영 모두 PostgreSQL 같은 호스트형 DB 연결 가능

## 환경 변수

루트에 `.env` 파일을 만들고 아래 값을 넣습니다.

```bash
ADMIN_PASSWORD=내가_쓸_어드민_비밀번호
VITE_NAVER_MAP_CLIENT_ID=네이버_지도_Client_ID
PORT=8787
DATABASE_URL=postgresql://pengrestaurant:yourpassword@localhost:5432/pengrestaurant
```

- `ADMIN_PASSWORD`: 로컬 API 서버 어드민 비밀번호
- `VITE_NAVER_MAP_CLIENT_ID`: 네이버 지도 Web Dynamic Map Client ID
- `PORT`: 로컬 API 서버 포트, 기본값 `8787`
- `DATABASE_URL`: PostgreSQL 연결 문자열

## 로컬 PostgreSQL 준비

WSL 기준으로 PostgreSQL을 설치하고 로컬 DB를 만듭니다.

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres psql
```

`psql` 안에서:

```sql
CREATE USER pengrestaurant WITH PASSWORD 'yourpassword';
CREATE DATABASE pengrestaurant OWNER pengrestaurant;
\q
```

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 열면 됩니다.

서버는 시작할 때 PostgreSQL에 접속해서 테이블을 자동 생성합니다. 기본 샘플 리뷰는 더 이상 넣지 않습니다.

## 네이버 지도 Client ID 받는 법

네이버 지도는 일반 검색 API 등록 화면이 아니라 네이버 클라우드 플랫폼 콘솔의 Maps 서비스에서 등록합니다.

1. NAVER Cloud Platform 콘솔 로그인
2. 가능하면 `VPC` 환경 선택
3. `Menu > Services > Application Services > Maps`
4. `Application` 메뉴 클릭
5. `Application 등록` 클릭
6. 사용할 API로 `Dynamic Map` 선택
7. 서비스 환경의 `Web 서비스 URL` 입력
8. 등록 후 `인증 정보`에서 `Client ID` 복사

중요:

- 로컬 개발 URL은 보통 `http://localhost` 로 등록합니다.
- 공식 문제해결 문서 기준으로 `Web 서비스 URL`에는 포트 번호와 URI를 넣지 않는 것이 안전합니다.
- 현재 프로젝트에서 필요한 값은 `Client ID`이며, `Client Secret`은 프론트엔드 지도 표시에는 사용하지 않습니다.

## 네이버 지도 무료 사용량 관련

네이버 지도 Maps API의 `Web Dynamic Map`, `Static Map`, `Geocoding`, `Reverse Geocoding`은 대표 계정에 한해 무료 사용량이 제공됩니다. 대표 계정이 아니면 과금될 수 있으므로 주의가 필요합니다.

무료 사용량을 최대한 안전하게 쓰려면:

- 반드시 대표 계정인지 확인
- Maps `Application` 화면에서 일별/월별 이용 한도 설정
- 임계치 알림 설정

## 참고 문서

- Maps 앱 등록: https://guide.ncloud-docs.com/docs/application-maps-app-vpc
- Maps quickstart: https://guide.ncloud-docs.com/docs/en/application-maps-procedure
- Maps 문제해결: https://guide.ncloud-docs.com/docs/en/application-maps-troubleshoot
- Maps 개요: https://guide.ncloud-docs.com/docs/en/maps-overview
