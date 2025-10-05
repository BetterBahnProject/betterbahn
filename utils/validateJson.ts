import z, { prettifyError, type ZodType } from "zod/v4";

export function validateJson<T extends ZodType>(
	schema: T,
	json: any
): z.output<typeof schema> {
	const validationResult = schema.safeParse(json);

	if (!validationResult.success) {
		throw new Error(prettifyError(validationResult.error));
	}

	return validationResult.data;
}
