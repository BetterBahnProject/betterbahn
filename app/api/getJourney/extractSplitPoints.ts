import type { VendoJourney } from "@/utils/schemas";
import type { SplitPoint, TrainLine } from "@/utils/types";
import { TRPCError } from "@trpc/server";

export function extractSplitPoints(journey: VendoJourney) {
	const map = new Map<string, SplitPoint>();

	journey.legs.forEach((leg, legIndex) => {
		if (leg.walking || !leg.stopovers) {
			return;
		}

		leg.stopovers.forEach((s, stopIndex) => {
			if (
				(legIndex === 0 && stopIndex === 0) ||
				(legIndex === journey.legs.length - 1 &&
					stopIndex === leg.stopovers!.length - 1)
			) {
				return;
			}

			if (s.arrival && s.departure && s.stop && !map.has(s.stop.id)) {
				const trainLine: TrainLine | undefined =
					typeof leg.line === "object"
						? {
								name: leg.line.name,
								product: leg.line.product || leg.line.productName,
						  }
						: undefined;

				map.set(s.stop.id, {
					station: { id: s.stop.id, name: s.stop.name || "" },
					arrival: s.arrival,
					departure: s.departure,
					trainLine,
					loadFactor: s.loadFactor,
					legIndex,
					stopIndex,
				});
			}
		});
	});

	const uniqueStops = Array.from(map.values());

	if (uniqueStops.length === 0) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "No split points found",
		});
	}

	return uniqueStops;
}
