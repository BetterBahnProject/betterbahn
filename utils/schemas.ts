import z from "zod/v4";

const vendoStationSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
});

export type VendoStation = z.infer<typeof vendoStationSchema>;

const vendoStopSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
});

const vendoLocationSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
});

const vendoPriceSchema = z.object({
	amount: z.number(),
	hint: z.string().nullable().optional(),
});

export type VendoPrice = z.infer<typeof vendoPriceSchema>;

const vendoLineSchema = z.object({
	name: z.string(),
	product: z.string().optional(),
	productName: z.string().optional(),
	mode: z.string().or(z.object()).optional(),
});

const originOrDestinationSchema = vendoStationSchema
	.or(vendoStopSchema)
	.or(vendoLocationSchema);

export type VendoOriginOrDestination =
	| z.infer<typeof originOrDestinationSchema>
	| undefined;

/**
 * allows parent schemas to be used with both
 * vendo-client (outputs string dates) as well as
 * tRPC (uses SuperJSON, feeding real Date objects into schema)
 */
const dateOrDateStringSchema = z
	.string()
	.transform((s) => new Date(s))
	.or(z.date());

const stopoverSchema = z.object({
	arrival: dateOrDateStringSchema.optional(),
	departure: dateOrDateStringSchema.optional(),
	stop: vendoStopSchema.optional(),
	loadFactor: z.unknown(),
});

const commonLegSchema = z.object({
	departure: dateOrDateStringSchema,
	line: vendoLineSchema.optional(),
	arrival: dateOrDateStringSchema,
	mode: z.string().optional(),
	duration: z.unknown(),
	walking: z.unknown(),
	departurePlatform: z.string().nullable().optional(),
	arrivalPlatform: z.string().nullable().optional(),
	delay: z.number().optional(),
	cancelled: z.boolean().optional(),
	stopovers: z.array(stopoverSchema).optional(),
});

const vendoLegSchema = commonLegSchema.extend({
	origin: originOrDestinationSchema.optional(),
	destination: originOrDestinationSchema.optional(),
});

export type VendoLeg = z.infer<typeof vendoLegSchema>;

export const vendoJourneySchema = z.object({
	legs: z.array(vendoLegSchema),
	price: vendoPriceSchema.optional(),
	duration: z.unknown().optional(),
});

// Schema for journeys that require valid origin/destination IDs
const validatedVendoLegSchema = commonLegSchema.extend({
	origin: originOrDestinationSchema,
	destination: originOrDestinationSchema,
});

export const validatedVendoJourneySchema = z.object({
	legs: z.array(validatedVendoLegSchema).min(1),
	price: vendoPriceSchema.optional(),
	duration: z.unknown().optional(),
});

export type VendoJourney = z.infer<typeof vendoJourneySchema>;
export type ValidatedVendoJourney = z.infer<typeof validatedVendoJourneySchema>;

export const vbidSchema = z.object({
	hinfahrtRecon: z.string(),
	hinfahrtDatum: z.string(),
});

export type VbidSchema = z.infer<typeof vbidSchema>;
