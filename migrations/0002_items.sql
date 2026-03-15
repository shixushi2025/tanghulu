CREATE TABLE IF NOT EXISTS items (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',
  summary     TEXT NOT NULL,
  cover       TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL,
  link        TEXT NOT NULL DEFAULT '',
  mood        TEXT NOT NULL DEFAULT '[]',
  country     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER DEFAULT (unixepoch()),
  updated_at  INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_date     ON items(date DESC);
