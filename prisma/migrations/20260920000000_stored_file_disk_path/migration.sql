-- StoredFile bytes now live on disk under UPLOADS_DIR instead of in Postgres.
-- No production data existed in this column yet, so this is a straight swap
-- rather than a backfill; if StoredFile rows already exist when this runs,
-- write their bytes to disk manually before applying, since ADD COLUMN ...
-- NOT NULL will fail against existing rows.
ALTER TABLE "StoredFile" DROP COLUMN "data";
ALTER TABLE "StoredFile" ADD COLUMN "path" TEXT NOT NULL;
