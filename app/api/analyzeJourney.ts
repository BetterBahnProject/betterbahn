import {
	vendoJourneySchema,
	type VendoJourney,
	type VendoStation,
} from "@/utils/schemas";
import { t } from "@/utils/trpc-init";
import { TRPCError } from "@trpc/server";
import type { SearchJourneysOptions } from "db-vendo-client";
import { data as loyaltyCards } from "db-vendo-client/format/loyalty-cards";
import { z } from "zod/v4";
import { extractSplitPoints } from "./getJourney/extractSplitPoints";
import { dbClient } from "./getJourney/getJourney";

export interface SplitAnalysis {
	splitStations: VendoStation[];
	segments: VendoJourney[];
}

export const analyzeJourney = t.procedure
	.input(
		z.object({
			journey: vendoJourneySchema,
			travelClass: z.int(),
			passengerAge: z.int().optional(),
			bahnCard: z.int().nullable(),
			hasDeutschlandTicket: z.boolean(),
		})
	)
	.subscription(async function* ({ input }) {
		// Split-Kandidaten aus vorhandenen Legs ableiten (keine zusätzlichen API Calls)
		const splitPoints = extractSplitPoints(input.journey);

		const splitOptions: SplitAnalysis[] = [];

		for (let i = 0; i < splitPoints.length; i++) {
			const splitPoint = splitPoints[i];

			yield {
				type: "processing",
				checked: i,
				currentStation: splitPoint.station?.name ?? null,
				total: splitPoints.length,
			} as const;

			const origin = input.journey.legs.at(0)!.origin;
			const destination = input.journey.legs.at(-1)!.destination;

			const queryOptions: SearchJourneysOptions = {
				results: 1,
				stopovers: true,
				firstClass: input.travelClass === 1,
				notOnlyFastRoutes: true,
				remarks: true,
				transfers: 3,
				age: input.passengerAge,
				deutschlandTicketDiscount: input.hasDeutschlandTicket,
				loyaltyCard:
					input.bahnCard && [25, 50, 100].includes(input.bahnCard)
						? {
								type: loyaltyCards.BAHNCARD,
								discount: input.bahnCard,
								class: input.travelClass || 2,
						  }
						: undefined,
			};

			const fetchJourney = async (params: {
				from: string;
				to: string;
				targetDeparture: Date;
			}) => {
				const untyped = await dbClient.journeys(params.from, params.to, {
					...queryOptions,
					departure: params.targetDeparture,
				});

				const validated = z
					.object({
						journeys: z.array(vendoJourneySchema),
					})
					.parse(untyped);

				const expected = params.targetDeparture.getTime();

				return (
					validated.journeys.find(
						(journey) =>
							Math.abs(journey.legs[0].departure.getTime() - expected) <= 60_000 // 1 Minute Toleranz
					) || null
				);
			};

			try {
				const [firstJourney, secondJourney] = await Promise.all([
					fetchJourney({
						from: origin!.id,
						to: splitPoint.station.id,
						targetDeparture: input.journey.legs.at(0)!.departure,
					}),
					fetchJourney({
						from: splitPoint.station.id,
						to: destination!.id,
						targetDeparture: splitPoint.departure,
					}),
				]);

				if (
					!firstJourney ||
					!secondJourney ||
					(firstJourney.price?.amount === undefined &&
						secondJourney.price?.amount === undefined)
				) {
					continue;
				}

				let totalPrice: number | null = null; // null = unknown

				// TODO this filter can probably be moved to frontend, no filtering on backend necessary
				if (
					firstJourney.price?.amount !== undefined &&
					secondJourney.price?.amount !== undefined
				) {
					totalPrice = firstJourney.price.amount + secondJourney.price.amount;
					const originalPrice = input.journey.price?.amount || 0;

					if (totalPrice >= originalPrice) {
						continue;
					}
				}

				splitOptions.push({
					splitStations: [splitPoint.station],
					segments: [firstJourney, secondJourney],
				});
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Error analyzing single split at ${splitPoint.station.name}`,
					cause: error,
				});
			}
		}

		yield {
			type: "complete",
			splitOptions,
		} as const;
	});
