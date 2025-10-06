import { fetchAndValidateJson } from "@/utils/fetchAndValidateJson";
import { parseHinfahrtReconWithAPI } from "@/utils/parseHinfahrtRecon";
import { vbidSchema, vendoJourneySchema } from "@/utils/schemas";
import { t } from "@/utils/trpc-init";
import { TRPCError } from "@trpc/server";
import { createClient, type SearchJourneysOptions } from "db-vendo-client";
import { data as loyaltyCards } from "db-vendo-client/format/loyalty-cards";
import { profile as dbProfile } from "db-vendo-client/p/db/index";
import { prettifyError, z } from "zod/v4";
import { extractSplitPoints } from "./extractSplitPoints";

const client = createClient(dbProfile, "mail@lukasweihrauch.de");

export const combi = t.procedure
	.input(
		z.object({
			vbid: z.string(),
			travelClass: z.int(),
			bahnCard: z.int().nullable(),
			passengerAge: z.int().optional(),
			hasDeutschlandTicket: z.boolean(),
		})
	)
	.subscription(async function* ({ input }) {
		const vbidRequest = await fetchAndValidateJson({
			url: `https://www.bahn.de/web/api/angebote/verbindung/${input.vbid}`,
			schema: vbidSchema,
		});

		const cookies = vbidRequest.response.headers.getSetCookie();
		const { data } = await parseHinfahrtReconWithAPI(vbidRequest.data, cookies);

		// Find first segment with halte data for start station
		const firstSegmentWithHalte =
			data.verbindungen[0].verbindungsAbschnitte.find(
				(segment) => segment.halte.length > 0
			);

		const lastSegmentWithHalte =
			data.verbindungen[0].verbindungsAbschnitte.findLast(
				(segment) => segment.halte.length > 0
			);

		if (!firstSegmentWithHalte || !lastSegmentWithHalte) {
			throw new Error("No segments with station data found");
		}

		const soidValue = firstSegmentWithHalte.halte[0].id;
		const zoidValue = lastSegmentWithHalte.halte.at(-1)!.id;

		if (!soidValue || !zoidValue) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "missing soid or zoid",
			});
		}

		const fromStationId = soidValue.match(/@L=(\d+)/)?.[1];
		const toStationId = zoidValue.match(/@L=(\d+)/)?.[1];

		const options: SearchJourneysOptions = {
			results: 10,
			stopovers: true,
			// Bei genauer Abfahrtszeit wollen wir exakte Treffer, nicht verschiedene Alternativen
			notOnlyFastRoutes: true,
			remarks: true, // Verbindungshinweise einschließen
			transfers: -1, // System entscheidet über optimale Anzahl Umstiege
			// Reiseklasse-Präferenz setzen - verwende firstClass boolean Parameter
			firstClass: input.travelClass === 1, // true für erste Klasse, false für zweite Klasse
			age: input.passengerAge, // Passagieralter für angemessene Preisgestaltung hinzufügen
			departure: undefined,
		};

		if (input.bahnCard !== null && [25, 50, 100].includes(input.bahnCard)) {
			options.loyaltyCard = {
				type: loyaltyCards.BAHNCARD,
				discount: input.bahnCard,
				class: input.travelClass,
			};
		}

		if (input.hasDeutschlandTicket) {
			options.deutschlandTicketDiscount = true;
			// Diese Option kann helfen, genauere Preise zurückzugeben wenn Deutschland-Ticket verfügbar ist
			options.deutschlandTicketConnectionsOnly = false; // Wir wollen alle Verbindungen, aber mit genauen Preisen
		}

		const journeys = await client.journeys(fromStationId, toStationId, options);

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

		const uniqueJourneys = parseResult.data.journeys.filter(
			(journey, index, arr) => {
				if (journey.legs.length === 0) {
					return false;
				}

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
						if (!j.legs || j.legs.length === 0) {
							return false;
						}

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

		// Sort by departure time
		// TODO move sorting to frontend?
		const uniqueJourneysSorted = uniqueJourneys.toSorted(
			(a, b) => a.legs[0].departure.getTime() - b.legs[0].departure.getTime()
		);

		yield { type: "journeys", journeys: uniqueJourneysSorted } as const;

		// Split-Kandidaten aus vorhandenen Legs ableiten (keine zusätzlichen API Calls)
		const splitPoints = extractSplitPoints(uniqueJourneysSorted[0]);

		const splitOptions = [];

		for (let i = 0; i < splitPoints.length; i++) {
			const splitPoint = splitPoints[i];

			yield {
				type: "processing",
				checked: i,
				currentStation: splitPoint.station?.name ?? null,
				total: splitPoints.length,
			} as const;

			const origin = uniqueJourneysSorted[0].legs.at(0)!.origin;
			const destination = uniqueJourneysSorted[0].legs.at(-1)!.destination;

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
				const untyped = await client.journeys(params.from, params.to, {
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
						targetDeparture: uniqueJourneysSorted[0].legs.at(0)!.departure,
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
					const originalPrice = uniqueJourneysSorted[0].price?.amount || 0;

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
