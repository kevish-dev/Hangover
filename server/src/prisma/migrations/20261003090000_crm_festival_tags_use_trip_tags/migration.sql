-- CrmFestival website tags now reference TripTag (the same tag pool the admin
-- form already uses) instead of FestivalTag. The old join table is left in
-- place so the previously deployed server keeps working until it is replaced.

-- CreateTable
CREATE TABLE "_CrmFestivalToTripTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CrmFestivalToTripTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CrmFestivalToTripTag_B_index" ON "_CrmFestivalToTripTag"("B");

-- AddForeignKey
ALTER TABLE "_CrmFestivalToTripTag" ADD CONSTRAINT "_CrmFestivalToTripTag_A_fkey" FOREIGN KEY ("A") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CrmFestivalToTripTag" ADD CONSTRAINT "_CrmFestivalToTripTag_B_fkey" FOREIGN KEY ("B") REFERENCES "TripTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over existing links, matching tags by name (creating any TripTag that is missing).
INSERT INTO "TripTag" ("id", "tag", "updatedAt")
SELECT gen_random_uuid()::text, ft."tag", CURRENT_TIMESTAMP
FROM "FestivalTag" ft
WHERE ft."id" IN (SELECT "B" FROM "_CrmFestivalToFestivalTag")
  AND NOT EXISTS (SELECT 1 FROM "TripTag" tt WHERE tt."tag" = ft."tag");

INSERT INTO "_CrmFestivalToTripTag" ("A", "B")
SELECT j."A", tt."id"
FROM "_CrmFestivalToFestivalTag" j
JOIN "FestivalTag" ft ON ft."id" = j."B"
JOIN "TripTag" tt ON tt."tag" = ft."tag"
ON CONFLICT DO NOTHING;
