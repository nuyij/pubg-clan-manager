# 🎮 PUBG 클랜 관리 시스템 v2.3

Discord 로그인 연동, PUBG API 실시간 갱신, 3대 랭킹 + 럭키드로우 기능을 갖춘 클랜 웹사이트입니다.

---

## 📁 프로젝트 구조

```
pubg-clan-manager/
├── src/
│   ├── lib/
│   │   ├── supabase.js        # Supabase 클라이언트 + DB 초기화 SQL
│   │   └── pubgApi.js         # PUBG API 연동 서비스
│   ├── stores/
│   │   ├── auth.js            # 인증 상태 (Pinia)
│   │   ├── settings.js        # 관리자 설정값 (Pinia)
│   │   └── ranking.js         # 랭킹 데이터 (Pinia)
│   ├── router/
│   │   └── index.js           # Vue Router
│   ├── components/
│   │   ├── common/
│   │   │   ├── NavBar.vue           # 상단 네비게이션
│   │   │   ├── LuckyDrawBanner.vue  # 당첨자 공지 배너
│   │   │   └── TipModal.vue         # 점수 공식 팝업
│   │   ├── ranking/
│   │   │   ├── ContributionRanking.vue  # 기여도 순위 탭
│   │   │   ├── BestPlayerRanking.vue    # 베스트 플레이어 탭
│   │   │   └── MostTimeRanking.vue      # 최장 플레이어 탭
│   │   └── admin/
│   │       ├── ScoreConfig.vue      # 점수 설정 섹션
│   │       ├── DataSync.vue         # 데이터 동기화 섹션
│   │       ├── UserManagement.vue   # 유저 관리 섹션
│   │       └── LuckyDraw.vue        # 럭키드로우 섹션
│   ├── views/
│   │   ├── HomeView.vue       # 메인 랭킹 페이지
│   │   └── AdminView.vue      # 관리자 패널
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── .env.example
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## ⚙️ 초기 설정 (순서대로 진행)

### 1단계: 의존성 설치
```bash
npm install
```

### 2단계: 환경변수 설정
`.env.example`을 복사하여 `.env.local` 파일 생성:
```bash
cp .env.example .env.local
```
그 후 `.env.local`에 실제 키 입력:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PUBG_API_KEY=your-pubg-api-key
VITE_PUBG_API_BASE=https://api.pubg.com/shards/kakao
```

> **PUBG API 서버 목록**
> - 카카오 서버: `https://api.pubg.com/shards/kakao`
> - 스팀 아시아: `https://api.pubg.com/shards/pc-as`
> - 글로벌: `https://api.pubg.com/shards/steam`

### 3단계: Supabase 설정

**A. 프로젝트 생성**
1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. `Settings > API`에서 `URL`과 `anon key` 복사

**B. DB 테이블 생성**
`src/lib/supabase.js` 파일 안의 주석 처리된 SQL을 전부 복사하여
`Supabase Dashboard > SQL Editor > New Query` 에 붙여넣고 실행

**C. Discord OAuth 설정**
1. [discord.com/developers/applications](https://discord.com/developers/applications) 에서 앱 생성
2. `OAuth2 > Redirects`에 `https://your-project.supabase.co/auth/v1/callback` 추가
3. `Client ID`와 `Client Secret` 복사
4. Supabase `Authentication > Providers > Discord` 에서 키 입력

### 4단계: 첫 번째 관리자 등록
1. Discord 로그인 후 본인의 Discord ID 확인
   - Discord에서 `설정 > 고급 > 개발자 모드 ON` 후 본인 프로필 우클릭 → "사용자 ID 복사"
2. Supabase SQL Editor에서 실행:
```sql
INSERT INTO members (pubg_name, discord_id, status, is_admin)
VALUES ('본인배그닉네임', '본인Discord숫자ID', '클랜원', true);
```

### 5단계: 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173` 접속

---

## 🚀 배포 (Vercel 기준)

1. GitHub에 코드 push
2. [vercel.com](https://vercel.com) 에서 레포지토리 연결
3. `Environment Variables`에 `.env.local`의 내용 입력
4. Deploy 클릭 → 자동 빌드 완료

---

## 📋 운영 시나리오

### 정기 데이터 갱신
1. 웹사이트 접속 → Discord 로그인
2. 상단 **[관리자]** 버튼 클릭
3. **데이터 동기화** 섹션에서 **[🔄 배그 API 데이터 강제 갱신]** 클릭
4. 진행 표시줄이 완료되면 각 랭킹 탭에서 확인

### 신규 유저 등록
- **로그인 없는 텟생:** 관리자 패널 > 유저 관리 > 닉네임 수동 입력 후 추가
- **30일 경과 시:** 목록에 ⚠️ 승급 대상 배지 표시 → [클랜원 승급] 버튼 클릭

### 럭키드로우 진행
1. **럭키 드로우** 섹션에서 최소 기여도 점수와 추첨 인원 설정
2. 대상자 현황 확인
3. **[🎲 추첨하기]** 클릭 → 당첨자 발표 화면
4. **[메인에 공지]** 클릭 → 메인 화면 상단 배너에 당첨자 표시

---

## 🗄️ Supabase RPC 함수 (선택사항, 성능 향상)

```sql
-- 점수 upsert를 원자적으로 처리하는 RPC
CREATE OR REPLACE FUNCTION upsert_match_data(
  p_pubg_name TEXT,
  p_kills INT, p_assists INT, p_damage FLOAT,
  p_survival_time INT, p_is_win INT,
  p_contribution INT, p_best_player FLOAT
) RETURNS void AS $$
BEGIN
  INSERT INTO match_data (pubg_name, total_kills, total_assists, total_damage,
    total_survival_time, total_wins, total_games, contribution_points, best_player_points)
  VALUES (p_pubg_name, p_kills, p_assists, p_damage,
    p_survival_time, p_is_win, 1, p_contribution, p_best_player)
  ON CONFLICT (pubg_name) DO UPDATE SET
    total_kills = match_data.total_kills + EXCLUDED.total_kills,
    total_assists = match_data.total_assists + EXCLUDED.total_assists,
    total_damage = match_data.total_damage + EXCLUDED.total_damage,
    total_survival_time = match_data.total_survival_time + EXCLUDED.total_survival_time,
    total_wins = match_data.total_wins + EXCLUDED.total_wins,
    total_games = match_data.total_games + 1,
    contribution_points = match_data.contribution_points + EXCLUDED.contribution_points,
    best_player_points = match_data.best_player_points + EXCLUDED.best_player_points,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 클랜 로고 교체 방법

`src/assets/clan_logo.png` 에 로고 파일 저장 후
`src/components/common/NavBar.vue` 수정:
```html
<!-- 기존 -->
<span class="text-black font-display font-bold text-lg">P</span>

<!-- 변경 -->
<img src="@/assets/clan_logo.png" class="w-full h-full object-contain" alt="logo" />
```
클랜명도 같은 파일에서 `CLAN NAME` 텍스트를 원하는 이름으로 변경하세요.
