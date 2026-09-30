-- Operations reminders no longer fall back to "every admin" when no recipients
-- are configured. Seed the current admins so behavior is unchanged on deploy
-- and the settings page reflects who actually receives these emails.
INSERT INTO "NotificationRecipient" ("id", "category", "userId")
SELECT gen_random_uuid()::text, 'OPERATIONS_REMINDER', u."id"
FROM "User" u
WHERE u."role" = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "NotificationRecipient" nr WHERE nr."category" = 'OPERATIONS_REMINDER'
  );
