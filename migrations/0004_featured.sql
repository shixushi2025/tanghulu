-- Homepage「精选」flag. Safe to run on existing D1 (column default 0).
-- After this migration, seed markdown `featured: true` is optional; admin checkbox writes the column.

ALTER TABLE items ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_items_featured ON items(featured);

UPDATE items SET featured = 1 WHERE id IN (
  'chatgpt',
  'claude-ai',
  'atomic-habits',
  'interstellar',
  'sapiens',
  'podcast-lex'
);
