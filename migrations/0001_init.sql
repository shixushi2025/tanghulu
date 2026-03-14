CREATE TABLE IF NOT EXISTS ratings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    TEXT    NOT NULL,
  score      INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  fingerprint TEXT   NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_fp ON ratings(item_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_ratings_item ON ratings(item_id);
