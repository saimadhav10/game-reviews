-- Use existing clean artwork URLs, bypassing cached copies of the old covers.
-- Limit the update to the four original starter-cover paths.
UPDATE games
SET cover_url = '/images/' || id || '-hero.jpg'
WHERE id IN ('elden-ring', 'metaphor-refantazio', 'balatro', 'cyberpunk-2077')
  AND cover_url = '/images/' || id || '.jpg';
