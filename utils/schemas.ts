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
	.or(vendoLocationSchema)
	.optional();

// Required origin/destination for journey validation
const requiredOriginOrDestinationSchema = vendoStationSchema
	.or(vendoStopSchema)
	.or(vendoLocationSchema);

export type VendoOriginOrDestination = z.infer<
	typeof originOrDestinationSchema
>;

const stopoverSchema = z.object({
	arrival: z.unknown().optional(),
	departure: z.unknown().optional(),
	stop: vendoStopSchema.optional(),
	loadFactor: z.unknown(),
});

const vendoLegSchema = z.object({
	origin: originOrDestinationSchema,
	destination: originOrDestinationSchema,
	departure: z.string(),
	line: vendoLineSchema.optional(),
	arrival: z.string(),
	mode: z.string().optional(),
	duration: z.unknown(),
	walking: z.unknown(),
	departurePlatform: z.string().nullable().optional(),
	arrivalPlatform: z.string().nullable().optional(),
	delay: z.number().optional(),
	cancelled: z.boolean().optional(),
	stopovers: z.array(stopoverSchema).optional(),
});

export type VendoLeg = z.infer<typeof vendoLegSchema>;

export const vendoJourneySchema = z.object({
	legs: z.array(vendoLegSchema),
	price: vendoPriceSchema.optional(),
	duration: z.unknown().optional(),
});

// Schema for journeys that require valid origin/destination IDs
const validatedVendoLegSchema = z.object({
	origin: requiredOriginOrDestinationSchema,
	destination: requiredOriginOrDestinationSchema,
	departure: z.string(),
	line: vendoLineSchema.optional(),
	arrival: z.string(),
	mode: z.string().optional(),
	duration: z.unknown(),
	walking: z.unknown(),
	departurePlatform: z.string().nullable().optional(),
	arrivalPlatform: z.string().nullable().optional(),
	delay: z.number().optional(),
	cancelled: z.boolean().optional(),
	stopovers: z.array(stopoverSchema).optional(),
});

export const validatedVendoJourneySchema = z.object({
	legs: z.array(validatedVendoLegSchema).min(1),
	price: vendoPriceSchema.optional(),
	duration: z.unknown().optional(),
});

export type VendoJourney = z.infer<typeof vendoJourneySchema>;
export type ValidatedVendoJourney = z.infer<typeof validatedVendoJourneySchema>;

export const VerbindungResponseSchema = z.object({
	hinfahrtRecon: z.string(),
	hinfahrtDatum: z.string(),
});

export type VerbindungResponse = z.infer<typeof VerbindungResponseSchema>;

const reconLegSchema = z.object({
	halte: z
		.array(
			z.object({
				id: z.string(),
			})
		)
		.min(0), // Allow empty arrays for walking segments or transfers
});

export const reconResponseSchema = z.object({
	verbindungen: z
		.array(
			z.object({
				verbindungsAbschnitte: z.array(reconLegSchema).min(1),
			})
		)
		.min(1),
});

export type ReconResponse = z.infer<typeof reconResponseSchema>;
