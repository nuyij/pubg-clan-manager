-- match_data FK 제거 (부계정 닉네임도 저장 가능하게)
ALTER TABLE match_data DROP CONSTRAINT IF EXISTS match_data_pubg_name_fkey;

-- member_id 컬럼 추가
ALTER TABLE match_data ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- RPC 함수 교체 (member_id 지원)
CREATE OR REPLACE FUNCTION upsert_match_data(
  p_pubg_name TEXT, p_member_id UUID, p_season_id UUID,
  p_kills INT, p_assists INT, p_damage FLOAT,
  p_survival_time INT, p_is_win INT,
  p_contribution INT, p_best_player FLOAT
) RETURNS void AS $$
BEGIN
  INSERT INTO match_data (pubg_name, member_id, season_id,
    total_kills, total_assists, total_damage,
    total_survival_time, total_wins, total_games,
    contribution_points, best_player_points)
  VALUES (p_pubg_name, p_member_id, p_season_id,
    p_kills, p_assists, p_damage,
    p_survival_time, p_is_win, 1,
    p_contribution, p_best_player)
  ON CONFLICT (pubg_name, season_id) DO UPDATE SET
    member_id           = COALESCE(EXCLUDED.member_id, match_data.member_id),
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
