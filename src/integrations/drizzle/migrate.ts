import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, db } from "#/integrations/drizzle/client";

async function main() {
	console.log("Running migrations...");
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("Migrations complete.");
}

main()
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exitCode = 1;
	})
	.finally(closeDb);
