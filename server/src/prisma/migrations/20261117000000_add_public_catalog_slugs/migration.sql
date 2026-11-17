BEGIN;

ALTER TABLE "CrmTrip" ADD COLUMN "publicSlug" TEXT;
ALTER TABLE "CrmFestival" ADD COLUMN "publicSlug" TEXT;

UPDATE "CrmTrip" SET "publicSlug" = CASE "id"
  WHEN '3c0fdab9-8419-4ff0-85fa-af83ce074cf0' THEN 'anini-namsai-tour-package'
  WHEN 'e541dbd3-a24f-4dc1-ae93-2ba8bc86afcc' THEN 'mechuka-tour-package'
  WHEN '8814b565-8e5c-46bc-ac3c-8f9683950175' THEN 'meghalaya-college-group-trip'
  WHEN 'ea5e3934-770c-4db1-bc7d-af71deee7d93' THEN 'tawang-college-group-trip'
  WHEN '049fc3f8-78c1-4c07-aee1-48edd7209948' THEN 'tawang-group-trip'
  WHEN '1e6217ed-2a25-46b4-b6ab-86e97d3a2a05' THEN 'ziro-valley-kaziranga-tour-package'
  ELSE COALESCE(NULLIF(trim(BOTH '-' FROM left(regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'), 60)), ''), 'trip') || '-' || replace("id", '-', '')
END;

UPDATE "CrmFestival" SET "publicSlug" = CASE "id"
  WHEN '033d854e-2001-4be0-ae9a-62d923e3bb9d' THEN 'meghalaya-cherry-blossom-festival-package'
  WHEN 'ce3eccfa-c52c-42b6-af3b-9fa085fa8107' THEN 'hornbill-festival-package-two-travelers'
  WHEN '5feb2a3a-9c47-4e9c-be67-2f3578c71872' THEN 'hornbill-festival-package'
  WHEN '409605c2-26cd-4cc6-b856-57ea934ad2c7' THEN 'ziro-music-festival-package'
  ELSE COALESCE(NULLIF(trim(BOTH '-' FROM left(regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'), 60)), ''), 'festival') || '-' || replace("id", '-', '')
END;

CREATE UNIQUE INDEX "CrmTrip_publicSlug_key" ON "CrmTrip" ("publicSlug");
CREATE UNIQUE INDEX "CrmFestival_publicSlug_key" ON "CrmFestival" ("publicSlug");

COMMIT;
