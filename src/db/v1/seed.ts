import { db } from "./connect";
import { statuses, systemStatuses } from "./schemas/statuses";
import { priorities, systemPriorities } from "./schemas/priorities";

async function seed() {
  await Promise.all([
    db.insert(statuses).values(systemStatuses).onConflictDoNothing(),
    db.insert(priorities).values(systemPriorities).onConflictDoNothing(),
  ]);
}

seed()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  });
