import { initTRPC } from "@trpc/server";
import SuperJSON from "superjson";
import { prettifyError, ZodError } from "zod/v4";

export const t = initTRPC.create({
	transformer: SuperJSON,
	errorFormatter(opts) {
		const { shape, error } = opts;

		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? prettifyError(error.cause) : null,
			},
		};
	},
});
