import { incrementApiCount } from "@/utils/apiCounter";
import { vendoJourneySchema, type VendoJourney } from "@/utils/schemas";
import type { SplitPoint } from "@/utils/types";
import { createClient } from "db-vendo-client";
import { profile as dbProfile } from "db-vendo-client/p/db/index";
import { z } from "zod/v4";
import type { QueryOptions } from "../splitJourney/QueryOptions";
import { createSplitResult } from "../splitJourney/createSplitResult";
import { findMatchingJourney } from "../splitJourney/findMatchingJourney";

const client = createClient(dbProfile, "mail@lukasweihrauch.de");

// Split Analysis Functions
export async function analyzeSingleSplit(
	originalJourney: VendoJourney,
	splitPoint: SplitPoint,
	queryOptions: QueryOptions,
	originalPrice: number
) {
	const origin = originalJourney.legs[0].origin;
	const destination =
		originalJourney.legs[originalJourney.legs.length - 1].destination;
	const originalDeparture = new Date(originalJourney.legs[0].departure);
	const splitDeparture = new Date(splitPoint.departure);

	try {
		// Increment API counters for both segments
		incrementApiCount(
			"SPLIT_SEARCH_SEGMENT_1",
			`${origin?.name} → ${splitPoint.station?.name}`
		);
		incrementApiCount(
			"SPLIT_SEARCH_SEGMENT_2",
			`${splitPoint.station?.name} → ${destination?.name}`
		);

		// Schema validation at entry point ensures origin/destination IDs exist

		// Make both API calls in parallel using Promise.all
		const [firstSegmentUntyped, secondSegmentUntyped] = await Promise.all([
			client.journeys(origin!.id, splitPoint.station.id, {
				...queryOptions,
				departure: originalDeparture,
			}),

			client.journeys(splitPoint.station.id, destination!.id, {
				...queryOptions,
				departure: splitDeparture,
			}),
		]);

		const clientJourneySchema = z.object({
			journeys: z.array(vendoJourneySchema),
		});

		const firstSegment = clientJourneySchema.parse(firstSegmentUntyped);
		const secondSegment = clientJourneySchema.parse(secondSegmentUntyped);

		if (
			firstSegment.journeys === undefined ||
			secondSegment.journeys === undefined
		) {
			return null;
		}

		const firstJourney = findMatchingJourney(
			firstSegment.journeys,
			originalDeparture
		);

		if (!firstJourney) {
			return null;
		}

		const secondJourney = findMatchingJourney(
			secondSegment.journeys,
			splitDeparture
		);

		if (!secondJourney) {
			return null;
		}

		// Calculate pricing
		const firstPrice = firstJourney.price?.amount || 0;
		const secondPrice = secondJourney.price?.amount || 0;
		const totalPrice = firstPrice + secondPrice;

		if (totalPrice > 0 && totalPrice < originalPrice) {
			return createSplitResult(
				"single",
				[splitPoint.station],
				[firstJourney, secondJourney],
				totalPrice,
				originalPrice,
				splitPoint.trainLine
			);
		}

		return null;
	} catch (error) {
		const typedError = error as { message: string };
		console.log(
			`Single split analysis error at ${splitPoint.station.name}:`,
			typedError.message
		);
		throw error; // Re-throw to be handled by Promise.allSettled
	}
}
