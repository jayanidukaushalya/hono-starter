export const openApiSpec = {
	openapi: "3.0.0",
	info: {
		title: "Hono Starter API",
		version: "0.0.1",
		description: "Add a path here whenever you add or change a route.",
	},
	components: {
		schemas: {
			Error: {
				type: "object",
				properties: { error: { type: "string" } },
				required: ["error"],
			},
			ValidationError: {
				type: "object",
				properties: {
					success: { type: "boolean", enum: [false] },
					error: { type: "object" },
				},
				required: ["success", "error"],
			},
			User: {
				type: "object",
				properties: {
					id: { type: "string", format: "uuid" },
					name: { type: "string" },
					email: { type: "string", format: "email" },
					emailVerified: { type: "boolean" },
					image: { type: "string", nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
		},
		securitySchemes: {
			sessionCookie: {
				type: "apiKey",
				in: "cookie",
				name: "better-auth.session_token",
			},
		},
	},
	paths: {
		"/health": {
			get: {
				summary: "Health check",
				responses: {
					"200": {
						description: "OK",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										status: { type: "string", enum: ["ok"] },
										timestamp: { type: "string", format: "date-time" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/greet": {
			get: {
				summary: "Greet a name",
				parameters: [
					{
						name: "name",
						in: "query",
						required: false,
						schema: {
							type: "string",
							minLength: 1,
							maxLength: 50,
							default: "Hono",
						},
					},
				],
				responses: {
					"200": {
						description: "OK",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: { message: { type: "string" } },
								},
							},
						},
					},
					"400": {
						description: "Invalid query parameters",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
				},
			},
		},
		"/me": {
			get: {
				summary: "Get the current authenticated user",
				security: [{ sessionCookie: [] }],
				responses: {
					"200": {
						description: "OK",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: { user: { $ref: "#/components/schemas/User" } },
								},
							},
						},
					},
					"401": {
						description: "No valid session",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
	},
};
