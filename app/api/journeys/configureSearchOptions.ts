import type { inferRouterInputs } from "@trpc/server/unstable-core-do-not-import";
import type { SearchJourneysOptions } from "db-vendo-client";
import { data as loyaltyCards } from "db-vendo-client/format/loyalty-cards";
import type { AppRouter } from "../[trpc]/route";

export const configureSearchOptions = (
	input: inferRouterInputs<AppRouter>["journeys"]
) => {
	const options: SearchJourneysOptions = {
		results: input.type === "accurate-time" ? 5 : input.results, // Weniger Ergebnisse bei genauer Zeit um Rauschen zu reduzieren
		stopovers: true,
		// Bei genauer Abfahrtszeit wollen wir exakte Treffer, nicht verschiedene Alternativen
		notOnlyFastRoutes: input.type === "accurate-time", // Nur schnelle Routen bei genauer Zeit
		remarks: true, // Verbindungshinweise einschließen
		transfers: -1, // System entscheidet über optimale Anzahl Umstiege
		// Reiseklasse-Präferenz setzen - verwende firstClass boolean Parameter
		firstClass: input.travelClass === 1, // true für erste Klasse, false für zweite Klasse
		age: input.passengerAge, // Passagieralter für angemessene Preisgestaltung hinzufügen
		departure: input.type === "accurate-time" ? input.departure : undefined, // Abfahrtszeit hinzufügen falls angegeben
	};

	// BahnCard-Rabattkarte hinzufügen falls angegeben
	if (input.bahnCard !== undefined && [25, 50, 100].includes(input.bahnCard)) {
		options.loyaltyCard = {
			type: loyaltyCards.BAHNCARD,
			discount: input.bahnCard,
			class: input.travelClass, // 1 für erste Klasse, 2 für zweite Klasse
		};
	}

	// Deutschland-Ticket Optionen für genauere Preisgestaltung
	if (input.hasDeutschlandTicket) {
		options.deutschlandTicketDiscount = true;
		// Diese Option kann helfen, genauere Preise zurückzugeben wenn Deutschland-Ticket verfügbar ist
		options.deutschlandTicketConnectionsOnly = false; // Wir wollen alle Verbindungen, aber mit genauen Preisen
	}

	console.log("API options being passed to db-vendo-client:", options);
	console.log("Travel class requested:", input.travelClass);
	console.log("BahnCard with class:", options.loyaltyCard);

	return options;
};
