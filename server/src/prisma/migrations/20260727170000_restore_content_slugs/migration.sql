-- Keep the URL identifiers used by the public application and by legacy
-- production content.  The previous migration removed these fields while
-- the API and client continued to resolve trips and festivals by slug.
ALTER TABLE "Circuit" ADD COLUMN "slug" TEXT NOT NULL;
ALTER TABLE "Trip" ADD COLUMN "slug" TEXT NOT NULL;
ALTER TABLE "Festival" ADD COLUMN "slug" TEXT NOT NULL;

CREATE UNIQUE INDEX "Circuit_slug_key" ON "Circuit"("slug");
CREATE UNIQUE INDEX "Trip_slug_key" ON "Trip"("slug");
CREATE UNIQUE INDEX "Festival_slug_key" ON "Festival"("slug");
