import { APIError } from "better-auth";
import { closeDb } from "#/db";
import { auth } from "#/lib/auth";

async function main() {
	console.log("Seeding database...");

	try {
		await auth.api.signUpEmail({
			body: {
				email: "ada@example.com",
				password: "password123",
				name: "Ada Lovelace",
			},
		});
	} catch (err) {
		if (
			!(err instanceof APIError && err.body?.code === "USER_ALREADY_EXISTS")
		) {
			throw err;
		}
	}

	console.log("Seed complete.");
}

main()
	.catch((err) => {
		console.error("Seed failed:", err);
		process.exitCode = 1;
	})
	.finally(closeDb);
