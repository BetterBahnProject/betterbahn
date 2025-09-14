import { vendoJourneySchema } from "@/utils/schemas";
import { createClient, type SearchJourneysOptions } from "db-vendo-client";
import { profile as dbProfile } from "db-vendo-client/p/db/index";
import { z } from "zod/v4";

const client = createClient(dbProfile, "mail@lukasweihrauch.de");
const TIME_TOLERANCE_MS = 60_000; // 1 Minute Toleranz

const schema = z.object({
	journeys: z.array(vendoJourneySchema),
});

interface Params {
	from: string;
	to: string;
	queryOptions: SearchJourneysOptions;
	targetDeparture: Date;
}

export const fetchJourney = async (params: Params) => {
	const untyped = await client.journeys(params.from, params.to, {
		...params.queryOptions,
		departure: params.targetDeparture,
	});

	const validated = schema.parse(untyped);
	const expected = params.targetDeparture.getTime();

	return (
		validated.journeys.find(
			(journey) =>
				Math.abs(journey.legs[0].departure.getTime() - expected) <=
				TIME_TOLERANCE_MS
		) || null
	);
};
