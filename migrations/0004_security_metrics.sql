CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  bucket INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_expiry ON rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS view_totals (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0 CHECK(count >= 0)
);
CREATE TABLE IF NOT EXISTS view_events (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  PRIMARY KEY (item_id, fingerprint, bucket)
);
CREATE INDEX IF NOT EXISTS idx_view_bucket ON view_events(bucket);
CREATE TRIGGER IF NOT EXISTS count_new_view AFTER INSERT ON view_events
BEGIN
  UPDATE view_totals SET count=count+1 WHERE item_id=NEW.item_id;
END;
CREATE TRIGGER IF NOT EXISTS cleanup_item_ratings AFTER DELETE ON items
BEGIN
  DELETE FROM ratings WHERE item_id=OLD.id;
END;
DELETE FROM ratings WHERE item_id NOT IN (SELECT id FROM items);
CREATE INDEX IF NOT EXISTS idx_items_category_date ON items(category, date DESC, id);

-- Keep historical aggregates while removing legacy raw IP identifiers.
UPDATE ratings SET fingerprint = 'legacy:' || id WHERE fingerprint NOT LIKE 'legacy:%' AND length(fingerprint) <> 64;
