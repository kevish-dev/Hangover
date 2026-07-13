CREATE TABLE IF NOT EXISTS "LandingTripType" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "iconName" TEXT NOT NULL DEFAULT 'Compass',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingTripType_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LandingTripType_isActive_sortOrder_idx" ON "LandingTripType"("isActive", "sortOrder");

INSERT INTO "LandingTripType" ("id", "label", "description", "tag", "imageUrl", "iconName", "sortOrder", "isActive", "updatedAt") VALUES
  ('landing-type-group', 'Group Trip', 'Travel together, make new friends, and share unforgettable moments.', 'Social | 5-10 Days', 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=700&h=900&fit=crop&auto=format&q=90', 'Users', 1, true, CURRENT_TIMESTAMP),
  ('landing-type-family', 'Family Trip', 'Create lifelong memories with your loved ones in beautiful destinations.', 'Kid-Friendly | 4-8 Days', 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&h=900&fit=crop&auto=format&q=90', 'Home', 2, true, CURRENT_TIMESTAMP),
  ('landing-type-couple', 'Couple Trip', 'Romantic getaways designed for just the two of you.', 'Romantic | 3-7 Days', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&h=900&fit=crop&auto=format&q=90', 'Heart', 3, true, CURRENT_TIMESTAMP),
  ('landing-type-students', 'Students Trip', 'Budget-friendly adventures perfect for college squads.', 'Budget | 3-5 Days', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=700&h=900&fit=crop&auto=format&q=90', 'GraduationCap', 4, true, CURRENT_TIMESTAMP),
  ('landing-type-trekking', 'Trekking Trip', 'Push your limits on high altitude trails and scenic mountains.', 'Adventure | 7-14 Days', 'https://images.unsplash.com/photo-1617380613434-7495e9b45dfb?w=700&h=900&fit=crop&auto=format&q=90', 'Mountain', 5, true, CURRENT_TIMESTAMP),
  ('landing-type-custom', 'Customised Trip', 'Tailor-made itineraries crafted exclusively for your preferences.', 'Flexible | Any Duration', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&h=900&fit=crop&auto=format&q=90', 'Compass', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
