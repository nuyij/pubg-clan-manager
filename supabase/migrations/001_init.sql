-- ================================================
-- PUBG 클랜 관리 시스템 전체 DB 초기화 스크립트
-- Supabase SQL Editor에서 전체 복사 후 Run 실행
-- ================================================

-- 1. members
CREATE TABLE IF NOT EXISTS members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id      TEXT UNIQUE,
  clan_nickname   TEXT UNIQUE,
  pubg_name       TEXT UNIQUE,
  pubg_account_id TEXT UNIQUE,
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','master')),
  status          TEXT NOT NULL DEFAULT '신규' CHECK (status IN ('신규','텟생','클랜원')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. settings (단일 행)
CREATE TABLE IF NOT EXISTS settings (
  id                    INTEGER PRIMARY KEY DEFAULT 1,
  kill_weight           FLOAT NOT NULL DEFAULT 10,
  assist_weight         FLOAT NOT NULL DEFAULT 5,
  rank_scores           JSONB NOT NULL DEFAULT '{"1":30,"2":25,"3":20,"4":15,"5":12,"6":9,"7":6,"8":4,"9":2,"10":1}',
  newbie_bonus          FLOAT NOT NULL DEFAULT 1.5,
  lucky_draw_min_points INTEGER NOT NULL DEFAULT 50,
  lucky_draw_count      INTEGER NOT NULL DEFAULT 3,
  last_synced_at        TIMESTAMPTZ,
  last_lucky_draw       JSONB,
  clan_name             TEXT NOT NULL DEFAULT 'MY CLAN',
  clan_logo_url         TEXT,
  auto_sync_enabled     BOOLEAN NOT NULL DEFAULT false,
  auto_sync_hour        INTEGER NOT NULL DEFAULT 4,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3. seasons
CREATE TABLE IF NOT EXISTS seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO seasons (name, started_at, is_active)
SELECT '시즌 1', NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM seasons);

-- 4. match_data (유저별 시즌별 누적)
CREATE TABLE IF NOT EXISTS match_data (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pubg_name           TEXT NOT NULL REFERENCES members(pubg_name) ON DELETE CASCADE,
  season_id           UUID REFERENCES seasons(id),
  total_kills         INTEGER NOT NULL DEFAULT 0,
  total_assists       INTEGER NOT NULL DEFAULT 0,
  total_damage        FLOAT NOT NULL DEFAULT 0,
  total_survival_time INTEGER NOT NULL DEFAULT 0,
  total_wins          INTEGER NOT NULL DEFAULT 0,
  total_games         INTEGER NOT NULL DEFAULT 0,
  contribution_points INTEGER NOT NULL DEFAULT 0,
  best_player_points  FLOAT NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pubg_name, season_id)
);

-- 5. match_history (중복 방지)
CREATE TABLE IF NOT EXISTS match_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      TEXT NOT NULL UNIQUE,
  season_id     UUID REFERENCES seasons(id),
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RLS
ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons      ENABLE ROW LEVEL SECURITY;

-- 읽기: 전체 공개
CREATE POLICY "read_members"       ON members       FOR SELECT USING (true);
CREATE POLICY "read_settings"      ON settings      FOR SELECT USING (true);
CREATE POLICY "read_match_data"    ON match_data    FOR SELECT USING (true);
CREATE POLICY "read_match_history" ON match_history FOR SELECT USING (true);
CREATE POLICY "read_seasons"       ON seasons       FOR SELECT USING (true);

-- 쓰기: 인증 사용자
CREATE POLICY "write_members"       ON members       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "write_settings"      ON settings      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "write_match_data"    ON match_data    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "write_match_history" ON match_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "write_seasons"       ON seasons       FOR ALL USING (auth.role() = 'authenticated');

-- 7. upsert_match_data RPC
CREATE OR REPLACE FUNCTION upsert_match_data(
  p_pubg_name TEXT, p_season_id UUID,
  p_kills INT, p_assists INT, p_damage FLOAT,
  p_survival_time INT, p_is_win INT,
  p_contribution INT, p_best_player FLOAT
) RETURNS void AS $$
BEGIN
  INSERT INTO match_data (pubg_name, season_id, total_kills, total_assists, total_damage,
    total_survival_time, total_wins, total_games, contribution_points, best_player_points)
  VALUES (p_pubg_name, p_season_id, p_kills, p_assists, p_damage,
    p_survival_time, p_is_win, 1, p_contribution, p_best_player)
  ON CONFLICT (pubg_name, season_id) DO UPDATE SET
    total_kills         = match_data.total_kills + EXCLUDED.total_kills,
    total_assists       = match_data.total_assists + EXCLUDED.total_assists,
    total_damage        = match_data.total_damage + EXCLUDED.total_damage,
    total_survival_time = match_data.total_survival_time + EXCLUDED.total_survival_time,
    total_wins          = match_data.total_wins + EXCLUDED.total_wins,
    total_games         = match_data.total_games + 1,
    contribution_points = match_data.contribution_points + EXCLUDED.contribution_points,
    best_player_points  = match_data.best_player_points + EXCLUDED.best_player_points,
    updated_at          = NOW();
END;
$$ LANGUAGE plpgsql;
