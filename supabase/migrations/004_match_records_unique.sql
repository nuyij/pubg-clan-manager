-- match_records unique constraint (중복 저장 방지)
ALTER TABLE match_records
  ADD CONSTRAINT match_records_match_id_pubg_name_key
  UNIQUE (match_id, pubg_name);
