import type { VendoLeg } from "@/utils/schemas";
import { getStationName } from "./journeyUtils";

// Definiere spezifische IC/ICE-Strecken, die vom Deutschland-Ticket abgedeckt werden
const deutschlandTicketICRoutes = [
	{
		name: "Berlin - BER - Elsterwerda",
		stations: [
			"Berlin Hbf",
			"Flughafen BER Terminal 1-2",
			"BER",
			"Doberlug-Kirchhain",
			"Elsterwerda",
		],
		trains: ["IC", "ICE 1076"], // Alle IC-Züge auf dieser Strecke plus spezifischer ICE
	},
	{
		name: "Berlin - Prenzlau",
		stations: [
			"Berlin Südkreuz",
			"Berlin Spandau",
			"Berlin Gesundbrunnen",
			"Prenzlau",
		],
		trains: ["IC", "ICE"], // IC- und ICE-Züge auf dieser Strecke
	},
	{
		name: "Potsdam - Berlin - Cottbus",
		stations: ["Potsdam", "Berlin Hbf", "Cottbus"],
		trains: ["IC 2431", "IC 2432"], // Nur diese spezifischen IC-Züge
	},
	{
		name: "Dresden - Freiberg - Chemnitz",
		stations: ["Dresden", "Freiberg", "Chemnitz"],
	},
	{
		name: "Dortmund - Siegen - Dillenburg",
		stations: [
			"Dortmund Hbf",
			"Witten Hbf",
			"Iserlohn-Letmathe",
			"Altena (Westf)",
			"Werdohl",
			"Plettenberg",
			"Finnentrop",
			"Lennestadt-Grevenbrück",
			"Lennestadt-Altenhundem",
			"Kreuztal",
			"Siegen-Weidenau",
			"Siegen Hbf",
			"Dillenburg",
		],
		trains: [
			"IC 2223",
			"IC 2225",
			"IC 2229",
			"IC 2323",
			"IC 2325",
			"IC 2327",
			"IC 2222",
			"IC 2224",
			"IC 2226",
			"IC 2320",
			"IC 2324",
			"IC 2326",
			"IC 2328",
		],
	},
	{
		name: "Bremen - Oldenburg - Emden - Norddeich",
		stations: [
			"Bremen Hbf",
			"Delmenhorst",
			"Hude",
			"Oldenburg(Oldb)Hbf",
			"Bad Zwischenahn",
			"Westerstede-Ocholt",
			"Augustfehn",
			"Leer(Ostfriesl)",
			"Emden Hbf",
		],
	},
	{
		name: "Rostock - Stralsund",
		stations: ["Rostock", "Ribnitz-Damgarten", "Velgast", "Stralsund"],
	},
	{
		name: "Erfurt - Weimar - Jena - Gera",
		stations: ["Erfurt", "Weimar", "Jena", "Gera"],
	},
	{
		name: "Stuttgart - Horb - Singen - Konstanz",
		stations: ["Stuttgart", "Horb", "Singen", "Konstanz"],
	},
];

const isICRouteCoveredByDeutschlandTicket = (leg: VendoLeg) => {
	if (!leg?.line || !leg.origin || !leg.destination) return false;
	const product = leg.line.product?.toLowerCase();
	if (!product || !["national", "nationalexpress"].includes(product))
		return false;

	const originName = getStationName(leg.origin).toLowerCase();
	const destinationName = getStationName(leg.destination).toLowerCase();
	const lineName = leg.line.name?.toUpperCase() || "";

	return deutschlandTicketICRoutes.some((route) => {
		const stationsLower = route.stations.map((s) => s.toLowerCase());
		const originOnRoute = stationsLower.some(
			(s) => originName.includes(s) || s.includes(originName)
		);
		const destinationOnRoute = stationsLower.some(
			(s) => destinationName.includes(s) || s.includes(destinationName)
		);
		if (!originOnRoute || !destinationOnRoute) return false;

		if (route.trains?.length) {
			return route.trains.some((pattern) => {
				if (pattern === "IC")
					return lineName.includes("IC") && !lineName.includes("ICE");
				if (pattern === "ICE") return lineName.includes("ICE");
				return lineName.includes(pattern);
			});
		}
		return true; // no specific trains listed
	});
};

export const legIsFlixTrain = (leg: VendoLeg) => {
	if (!leg?.line) return false;
	const name = leg.line.name?.toUpperCase() || "";
	const product = leg.line.product?.toUpperCase() || "";
	return /FLX|FLIXTRAIN/.test(name + product);
};

export const isLegCoveredByDeutschlandTicket = (
	leg: VendoLeg,
	hasDeutschlandTicket: boolean
) => {
	if (!hasDeutschlandTicket) return false;
	if (leg.walking) return true;
	if (!leg.line || legIsFlixTrain(leg)) return false; // FlixTrains never covered
	const product = leg.line.product?.toLowerCase() || "";
	return (
		!["nationalexpress", "national"].includes(product) ||
		isICRouteCoveredByDeutschlandTicket(leg)
	);
};
