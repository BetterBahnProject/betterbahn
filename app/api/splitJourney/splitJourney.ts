import { vendoJourneySchema } from "@/utils/schemas";
import { t } from "@/utils/trpc-init";
import { z } from "zod/v4";
import { analyzeSingleSplit } from "../journeys/analyzeSingleSplit";
import { extractSplitPoints } from "./extractSplitPoints";

export const VERBOSE = true; // Ausführliche Logs ein/ausschalten

const splitJourneyInputSchema = z.object({
	originalJourney: vendoJourneySchema,
	bahnCard: z.number().optional(),
	hasDeutschlandTicket: z.boolean(),
	passengerAge: z.int().optional(),
	travelClass: z.int().catch(2),
});

export type SplitJourneyInput = z.infer<typeof splitJourneyInputSchema>;

export const splitJourney = t.procedure
	.input(splitJourneyInputSchema)
	.subscription(async function* ({ input }) {
		// Split-Kandidaten aus vorhandenen Legs ableiten (keine zusätzlichen API Calls)
		const splitPoints = extractSplitPoints(input.originalJourney);

		yield { type: "start", total: splitPoints.length } as const;

		// Find split options with progress updates

		const splitOptions = [];

		if (VERBOSE) {
			console.log(
				`\n🔍 Analyse von ${splitPoints.length} Split-Stationen gestartet`
			);
		}

		for (let i = 0; i < splitPoints.length; i++) {
			const splitPoint = splitPoints[i];

			yield {
				type: "processing",
				checked: i,
				currentStation: splitPoint.station?.name,
			} as const;

			const option = await analyzeSingleSplit(input, splitPoint);

			if (option) {
				splitOptions.push(option);
			}

			yield { type: "current-done" } as const;
		}

		yield { type: "complete", splitOptions } as const;
	});
