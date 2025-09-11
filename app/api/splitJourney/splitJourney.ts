import { vendoJourneySchema } from "@/utils/schemas";
import { TRPCError } from "@trpc/server";
import { data as loyaltyCards } from "db-vendo-client/format/loyalty-cards";
import { z } from "zod/v4";
import { analyzeSingleSplit } from "../journeys/analyzeSingleSplit";
import { extractSplitPoints } from "./extractSplitPoints";
import type { QueryOptions } from "./QueryOptions";
import { t } from "@/utils/trpc-init";

const MIN_SINGLE_SAVINGS_FACTOR = 1; // Preis muss < original * 0.98 sein
export const VERBOSE = true; // Ausführliche Logs ein/ausschalten

export const splitJourney = t.procedure
	.input(
		z.object({
			originalJourney: vendoJourneySchema,
			bahnCard: z.number().optional(),
			hasDeutschlandTicket: z.boolean(),
			passengerAge: z.int().optional(),
			travelClass: z.int().catch(2),
		})
	)
	.query(async function* ({ input }) {
		// Split-Kandidaten aus vorhandenen Legs ableiten (keine zusätzlichen API Calls)
		const splitPoints = extractSplitPoints(input.originalJourney);

		if (splitPoints.length === 0) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "No split points found",
			});
		}

		const queryOptions: QueryOptions = {
			results: 1,
			stopovers: true,
			firstClass: input.travelClass === 1,
			notOnlyFastRoutes: true,
			remarks: true,
			transfers: 3,
			age: input.passengerAge,
			deutschlandTicketDiscount: input.hasDeutschlandTicket,
		};

		if (input.bahnCard && [25, 50, 100].includes(input.bahnCard)) {
			queryOptions.loyaltyCard = {
				type: loyaltyCards.BAHNCARD,
				discount: input.bahnCard,
				class: input.travelClass || 2,
			};
		}

		yield `data: ${JSON.stringify({
			type: "progress",
			checked: 0,
			total: splitPoints.length,
			message: "Analyse gestartet...",
		})}\n\n`;

		const originalPrice = input.originalJourney.price?.amount || 0;

		// Find split options with progress updates

		const splitOptions = [];

		if (VERBOSE) {
			console.log(
				`\n🔍 Analyse von ${splitPoints.length} Split-Stationen gestartet (streaming=true)`
			);
		}

		for (let i = 0; i < splitPoints.length; i++) {
			const sp = splitPoints[i];

			yield `data: ${JSON.stringify({
				type: "progress",
				checked: i,
				total: splitPoints.length,
				message: `Prüfe ${sp.station?.name}...`,
				currentStation: sp.station?.name,
			})}\n\n`;

			try {
				const option = await analyzeSingleSplit(
					input.originalJourney,
					sp,
					queryOptions,
					originalPrice
				);
				if (
					option &&
					option.totalPrice < originalPrice * MIN_SINGLE_SAVINGS_FACTOR
				)
					splitOptions.push(option);
			} catch {
				/* logged */
			}

			yield `data: ${JSON.stringify({
				type: "progress",
				checked: i + 1,
				total: splitPoints.length,
				message:
					i + 1 === splitPoints.length
						? "Analyse abgeschlossen"
						: `${i + 1}/${splitPoints.length} Stationen geprüft`,
				currentStation: sp.station?.name,
			})}\n\n`;

			if (i < splitPoints.length - 1) {
				await new Promise((r) => setTimeout(r, 100));
			}
		}

		// Send final result
		return `data: ${JSON.stringify({
			type: "complete",
			success: true,
			splitOptions: splitOptions.sort((a, b) => b.savings - a.savings),
			originalPrice,
		})}\n\n`;
	});
