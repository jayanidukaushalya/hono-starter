import { app } from "#/app";
import { env } from "#/lib/env";

console.log(`Listening on http://localhost:${env.PORT}`);

export default {
	port: env.PORT,
	fetch: app.fetch,
};
