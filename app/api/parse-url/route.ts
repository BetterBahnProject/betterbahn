import { ReconResponse, VerbindungResponse } from "@/utils/schemas";
import type { ExtractedData } from "@/utils/types";
import { apiErrorHandler } from "../_lib/error-handler";
import { getReconAndVerbindungenBrowserResponses } from "../_lib/browser";

// POST-Route für URL-Parsing
const handler = async (request: Request) => {
	const body = await request.json();
	const { url } = body;

	if (!url) {
		return Response.json(
			{ error: "Missing required parameter: url" },
			{ status: 400 }
		);
	}
	const vbid = new URL(url).searchParams.get("vbid");
	if (!vbid) {
		return Response.json(
			{ error: "URL is missing required vbid parameter" },
			{ status: 400 }
		);
	}

	let journeyDetails: ExtractedData;
	try {
		journeyDetails = await extractJourneyDetailsByVbid(vbid);
	} catch (error) {
		console.error(
			`❌ Error extracting journey details by vbid ${vbid}:`,
			error
		);
		return Response.json(
			{ error: "Failed to extract journey details." },
			{ status: 500 }
		);
	}

	if (!journeyDetails.fromStationId || !journeyDetails.toStationId) {
		return Response.json(
			{ error: "journeyDetails is missing fromStationId or toStationId" },
			{ status: 500 }
		);
	}

	displayJourneyInfo(journeyDetails);

	return Response.json({
		success: true,
		journeyDetails,
	});
};

export async function POST(request: Request) {
	return await apiErrorHandler(() => handler(request));
}

const extractStationName = (value: string | null) => {
	if (!value) {
		return null;
	}

	const oMatch = value.match(/@O=([^@]+)/);

	if (oMatch) {
		return decodeURIComponent(oMatch[1]).replaceAll("+", " ").trim();
	}

	const parts = value.split("@L=");
	return parts.length > 0
		? decodeURIComponent(parts[0]).replaceAll("+", " ").trim()
		: decodeURIComponent(value);
};

const extractStationId = (value: string | null) =>
	value?.match(/@L=(\d+)/)?.[1] || null;

const parseDateTime = (value: string | null) => {
	if (!value) {
		return {};
	}

	if (value.includes("T")) {
		const [datePart, timePart] = value.split("T");
		const timeOnly = timePart.split("+")[0].split("-")[0];
		const [hours, minutes] = timeOnly.split(":");
		return { date: datePart, time: `${hours}:${minutes}` };
	}

	return { date: value };
};

async function extractJourneyDetailsByVbid(
	vbid: string
): Promise<ExtractedData> {
	const [reconResponse, vbidResponse] =
		await getReconAndVerbindungenBrowserResponses(vbid);
	const journeySearchUrl = buildJourneySearchUrl(reconResponse, vbidResponse);
	return extractJourneyDetails(journeySearchUrl);
}

function extractJourneyDetails(url: string): ExtractedData {
	const urlObj = new URL(url);
	const hash = urlObj.hash;

	const details: ExtractedData = {
		fromStation: null,
		fromStationId: null,
		toStation: null,
		toStationId: null,
		date: null,
		time: null,
		class: null,
	};

	// Extract from hash parameters (consistent approach)
	const params = new URLSearchParams(hash.replace("#", ""));

	const soidValue = params.get("soid");
	const zoidValue = params.get("zoid");
	const dateValue = params.get("hd");
	const timeValue = params.get("ht");
	const classValue = params.get("kl");

	if (soidValue) {
		details.fromStationId = extractStationId(soidValue);
		details.fromStation = extractStationName(soidValue);
	}

	if (zoidValue) {
		details.toStationId = extractStationId(zoidValue);
		details.toStation = extractStationName(zoidValue);
	}

	// Handle date/time extraction
	const dateTimeInfo = parseDateTime(dateValue);
	if (dateTimeInfo.date) details.date = dateTimeInfo.date;
	if (dateTimeInfo.time && !details.time) details.time = dateTimeInfo.time;
	if (timeValue && !details.time) details.time = timeValue;

	if (classValue) details.class = parseInt(classValue, 10);

	return details;
}

function displayJourneyInfo(journeyDetails: ExtractedData) {
	if (!journeyDetails || "error" in journeyDetails) {
		console.log("❌ Failed to extract journey information");
		return;
	}

	const formatInfo = [
		`From: ${journeyDetails.fromStation || "Unknown"} (${
			journeyDetails.fromStationId || "N/A"
		})`,
		`To: ${journeyDetails.toStation || "Unknown"} (${
			journeyDetails.toStationId || "N/A"
		})`,
		`Date: ${journeyDetails.date || "N/A"}`,
		`Time: ${journeyDetails.time || "N/A"}`,
		`Class: ${journeyDetails.class === 1 ? "First" : "Second"}`,
	].join(" | ");

	console.log(formatInfo);
}

function buildJourneySearchUrl(
	reconResponse: ReconResponse,
	verbindungenResponse: VerbindungResponse
): string {
	const newUrl = new URL("https://www.bahn.de/buchung/fahrplan/suche");

	// Use hash parameters for consistency with DB URLs
	const hashParams = new URLSearchParams();

	// Find first segment with halte data for start station
	const firstSegmentWithHalte =
		reconResponse.verbindungen[0].verbindungsAbschnitte.find(
			(segment) => segment.halte.length > 0
		);
	const lastSegmentWithHalte =
		reconResponse.verbindungen[0].verbindungsAbschnitte.findLast(
			(segment) => segment.halte.length > 0
		);

	if (!firstSegmentWithHalte || !lastSegmentWithHalte) {
		throw new Error("No segments with station data found");
	}

	hashParams.set("soid", firstSegmentWithHalte.halte[0].id);
	hashParams.set("zoid", lastSegmentWithHalte.halte.at(-1)!.id);

	// Add date information from the booking
	if (verbindungenResponse.hinfahrtDatum) {
		hashParams.set("hd", verbindungenResponse.hinfahrtDatum);
	}

	newUrl.hash = hashParams.toString();

	return newUrl.toString();
}
