-- match_records에 파티원 목록 컬럼 추가
ALTER TABLE match_records
  ADD COLUMN IF NOT EXISTS party_members TEXT[] DEFAULT '{}';
