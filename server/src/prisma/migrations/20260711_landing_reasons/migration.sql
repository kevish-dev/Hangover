CREATE TABLE IF NOT EXISTS "LandingReason" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingReason_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LandingReason_isActive_sortOrder_idx"
  ON "LandingReason"("isActive", "sortOrder");

INSERT INTO "LandingReason" ("id", "title", "description", "detail", "imageUrl", "sortOrder", "isActive", "updatedAt")
VALUES
  ('landing-reason-cultural-immersion', 'Cultural Immersion with the Local Tribe', 'Deep dive into local traditions.', 'Experience the vibrant heritage, rituals, and daily life of indigenous tribes, gaining a profound understanding of their ancient customs.', 'https://images.unsplash.com/photo-1771766995256-1618791109d5?w=900&h=520&fit=crop&auto=format&q=90', 1, true, CURRENT_TIMESTAMP),
  ('landing-reason-trekking-trails', 'Trekking and Village Trails', 'Explore the untouched paths.', 'Hike through breathtaking landscapes, hidden valleys, and remote villages that remain untouched by commercial tourism.', 'https://images.unsplash.com/photo-1621531518034-94ecf4778186?w=900&h=520&fit=crop&auto=format&q=90', 2, true, CURRENT_TIMESTAMP),
  ('landing-reason-community-travel', 'Community Led Travel', 'Empowering local hosts.', 'Our journeys directly support local communities, ensuring sustainable tourism that benefits the people who call these places home.', 'https://images.unsplash.com/photo-1536607961765-592e80bcc19e?w=900&h=520&fit=crop&auto=format&q=90', 3, true, CURRENT_TIMESTAMP),
  ('landing-reason-culinary', 'Authentic Culinary Experience', 'Taste the true local flavors.', 'From foraging wild ingredients to cooking alongside local hosts, immerse yourself in the rich and diverse culinary traditions of the region.', 'https://images.unsplash.com/photo-1576656501005-5c5e7543bfaa?w=900&h=520&fit=crop&auto=format&q=90', 4, true, CURRENT_TIMESTAMP),
  ('landing-reason-bonfire', 'Memories by the Fire (BBQ & Bonfire)', 'Unwind under the stars.', 'End your days sharing stories, enjoying warm BBQ, and building lifelong connections under a starlit sky.', 'https://images.unsplash.com/photo-1532458605850-e9f7a26d9f80?w=900&h=520&fit=crop&auto=format&q=90', 5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
