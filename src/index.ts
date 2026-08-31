import { app } from "#/app";
import { closeDb } from "#/integrations/drizzle/client";
import { env } from "#/lib/env";

console.log(`Listening on http://localhost:${env.PORT}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, async () => {
		await closeDb();
		process.exit(0);
	});
}

export default {
	port: env.PORT,
	fetch: app.fetch,
};
