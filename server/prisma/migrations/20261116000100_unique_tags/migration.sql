UPDATE tags SET name = lower(trim(name));
UPDATE task_tags SET tagId = (
  SELECT min(canonical.id) FROM tags original
  JOIN tags canonical ON original.name = canonical.name
  WHERE original.id = task_tags.tagId
);
DELETE FROM task_tags WHERE id NOT IN (SELECT min(id) FROM task_tags GROUP BY taskId, tagId);
DELETE FROM tags WHERE id NOT IN (SELECT min(id) FROM tags GROUP BY name);
CREATE UNIQUE INDEX "tags_name_key" ON tags(name);
CREATE UNIQUE INDEX "task_tags_taskId_tagId_key" ON task_tags(taskId, tagId);
