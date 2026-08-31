import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "#/lib/auth";

export type AuthVariables = {
	user: (typeof auth.$Infer.Session)["user"];
	session: (typeof auth.$Infer.Session)["session"];
};

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
	async (c, next) => {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });

		if (!session) {
			throw new HTTPException(401, { message: "Unauthorized" });
		}

		c.set("user", session.user);
		c.set("session", session.session);

		await next();
	},
);
