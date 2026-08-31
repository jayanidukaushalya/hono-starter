import { closeDb, db } from "#/db";
import { users } from "#/db/schema";

async function main() {
	console.log("Seeding database...");

	await db
		.insert(users)
		.values([{ email: "ada@example.com", name: "Ada Lovelace" }])
		.onConflictDoNothing();

	console.log("Seed complete.");
}

main()
	.catch((err) => {
		console.error("Seed failed:", err);
		process.exitCode = 1;
	})
	.finally(closeDb);
