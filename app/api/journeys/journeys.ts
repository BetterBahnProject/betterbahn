import {
	getApiCount,
	incrementApiCount,
	resetApiCount,
} from "@/utils/apiCounter";
import { vendoJourneySchema } from "@/utils/schemas";
import { TRPCError } from "@trpc/server";
import { createClient } from "db-vendo-client";
import { profile as dbProfile } from "db-vendo-client/p/db/index";
import { prettifyError, z } from "zod/v4";
import { configureSearchOptions } from "./configureSearchOptions";
import { t } from "@/utils/trpc-init";

const userAgent = "mail@lukasweihrauch.de";
const client = createClient(dbProfile, userAgent);

const commonJourneyParamsSchema = z.object({
	from: z.string().nonempty(),
	to: z.string().nonempty(),
	bahnCard: z.number().optional(),
	passengerAge: z.number().int().optional(),
	hasDeutschlandTicket: z.boolean(),
	travelClass: z.number().catch(2),
});

export type CommonJourneyParams = z.infer<typeof commonJourneyParamsSchema>;

export const journeys = t.procedure
	.input(
		z.discriminatedUnion("type", [
			commonJourneyParamsSchema.extend({
				type: z.literal("accurate-time"),
				departure: z.date().refine((date) => date >= new Date(), {
					error: "Departure (Abfahrt) darf nicht in der Vergangenheit liegen",
				}),
			}),
			commonJourneyParamsSchema.extend({
				type: z.literal("no-accurate-time"),
				results: z.number().catch(10),
			}),
		])
	)
	.query(async ({ input }) => {
		// API-Zähler für neue Verbindungssuche zurücksetzen
		resetApiCount();

		const options = configureSearchOptions(input);

		// API-Zähler für Verbindungssuche erhöhen
		incrementApiCount(
			"JOURNEY_SEARCH",
			`Searching journeys from ${input.from} to ${input.to}`
		);

		// Verbindungen von DB-API abrufen
		const journeys = await client.journeys(input.from, input.to, options);

		const parseResult = z
			.object({ journeys: z.array(vendoJourneySchema) })
			.safeParse(journeys);

		if (!parseResult.success) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Validation of 'journeys' response of DB-API failed: ${prettifyError(
					parseResult.error
				)}`,
				cause: parseResult.error,
			});
		}

		let allJourneys = parseResult.data.journeys;

		console.log(`Received ${allJourneys.length} journeys from main query`);

		// Filter journeys to only show exact matches for the search parameters
		if (input.type === "accurate-time" && allJourneys.length > 0) {
			const targetDepartureTime = input.departure;
			console.log(
				`Filtering for exact matches to departure time: ${targetDepartureTime.toISOString()}`
			);

			// Filter journeys that exactly match the search criteria
			const exactMatches = allJourneys.filter((journey) => {
				if (journey.legs.length === 0) {
					return false;
				}

				const firstLeg = journey.legs[0];
				const lastLeg = journey.legs.at(-1)!;

				// Check if start station matches
				const startStationMatches = firstLeg.origin?.id === input.from;

				// Check if end station matches
				const endStationMatches = lastLeg.destination?.id === input.to;

				// Check if departure time matches (within 1 minute tolerance for exact time matching)
				const journeyDeparture = new Date(firstLeg.departure);
				const timeDifference = Math.abs(
					journeyDeparture.getTime() - targetDepartureTime.getTime()
				);

				const timeMatches = timeDifference <= 60000; // 1 minute tolerance

				return startStationMatches && endStationMatches && timeMatches;
			});

			console.log(
				`Found ${exactMatches.length} exact matches out of ${allJourneys.length} total journeys`
			);

			if (exactMatches.length > 0) {
				// Remove duplicates based on journey signature, but keep different ticket types/prices
				const uniqueExactMatches = exactMatches.filter(
					(journey, index, arr) => {
						const journeySignature = journey.legs
							.map(
								(leg) =>
									`${leg.line?.name || "walk"}-${leg.origin?.id}-${
										leg.destination?.id
									}-${leg.departure}`
							)
							.join("|");

						const key = `${journeySignature}-${
							journey.price?.amount || "no-price"
						}`;
						return (
							arr.findIndex((j) => {
								const jSignature = j.legs
									.map(
										(leg) =>
											`${leg.line?.name || "walk"}-${leg.origin?.id}-${
												leg.destination?.id
											}-${leg.departure}`
									)
									.join("|");
								const jKey = `${jSignature}-${j.price?.amount || "no-price"}`;
								return jKey === key;
							}) === index
						);
					}
				);

				// Sort by price if multiple options for the same journey
				uniqueExactMatches.sort((a, b) => {
					const priceA = a.price?.amount || 0;
					const priceB = b.price?.amount || 0;
					return priceA - priceB;
				});

				allJourneys = uniqueExactMatches;
				console.log(`Using ${allJourneys.length} unique exact matches`);
			} else {
				console.log("No exact matches found, keeping all journeys as fallback");
			}
		} else {
			// If no specific departure time is provided, remove general duplicates
			const uniqueJourneys = allJourneys.filter((journey, index, arr) => {
				if (journey.legs.length === 0) return false;

				const journeySignature = journey.legs
					.map(
						(leg) =>
							`${leg.line?.name || "walk"}-${leg.origin?.id}-${
								leg.destination?.id
							}-${leg.departure}`
					)
					.join("|");

				const key = `${journeySignature}-${
					journey.price?.amount || "no-price"
				}`;
				return (
					arr.findIndex((j) => {
						if (!j.legs || j.legs.length === 0) return false;
						const jSignature = j.legs
							.map(
								(leg) =>
									`${leg.line?.name || "walk"}-${leg.origin?.id}-${
										leg.destination?.id
									}-${leg.departure}`
							)
							.join("|");
						const jKey = `${jSignature}-${j.price?.amount || "no-price"}`;
						return jKey === key;
					}) === index
				);
			});

			// Sort by departure time
			uniqueJourneys.sort(
				(a, b) =>
					new Date(a.legs[0].departure).getTime() -
					new Date(b.legs[0].departure).getTime()
			);

			allJourneys = uniqueJourneys;
			console.log(`Total unique journeys: ${allJourneys.length}`);
		}

		if (input.hasDeutschlandTicket) {
			console.log(
				"Deutschland-Ticket enabled - all journeys should be visible with accurate pricing"
			);
		}

		console.log(
			`\n✅ JOURNEY SEARCH COMPLETED - Total API calls: ${getApiCount()}\n`
		);

		return allJourneys;
	});
