import { fetchAndValidateJson } from "@/utils/fetchAndValidateJson";
import { parseHinfahrtReconWithAPI } from "@/utils/parseHinfahrtRecon";
import { vbidSchema } from "@/utils/schemas";
import { t } from "@/utils/trpc-init";
import type { ExtractedData } from "@/utils/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

export const parseUrl = t.procedure
	.input(
		z.object({
			url: z.string(),
		})
	)
	.query(async ({ input }) => {
		const journeyDetails = extractJourneyDetails(
			await getResolvedUrlBrowserless(input.url)
		);

		if ("error" in journeyDetails) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				cause: journeyDetails.error,
			});
		}

		if (!journeyDetails.fromStationId || !journeyDetails.toStationId) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "journeyDetails is missing fromStationId or toStationId",
			});
		}

		displayJourneyInfo(journeyDetails);

		return journeyDetails;
	});

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

function extractJourneyDetails(url: string) {
	try {
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
	} catch (error) {
		console.error("❌ Error extracting journey details:", error);
		return {
			error: "Failed to extract journey details",
			details: (error as Error).message,
		};
	}
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

async function getResolvedUrlBrowserless(url: string) {
	const vbid = new URL(url).searchParams.get("vbid");

	if (!vbid) {
		throw new Error("No vbid parameter found in URL");
	}

	const vbidRequest = await fetchAndValidateJson({
		url: `https://www.bahn.de/web/api/angebote/verbindung/${vbid}`,
		schema: vbidSchema,
	});

	const cookies = vbidRequest.response.headers.getSetCookie();
	const { data } = await parseHinfahrtReconWithAPI(vbidRequest.data, cookies);

	const newUrl = new URL("https://www.bahn.de/buchung/fahrplan/suche");

	// Use hash parameters for consistency with DB URLs
	const hashParams = new URLSearchParams();

	// Find first segment with halte data for start station
	const firstSegmentWithHalte = data.verbindungen[0].verbindungsAbschnitte.find(
		(segment) => segment.halte.length > 0
	);
	const lastSegmentWithHalte =
		data.verbindungen[0].verbindungsAbschnitte.findLast(
			(segment) => segment.halte.length > 0
		);

	if (!firstSegmentWithHalte || !lastSegmentWithHalte) {
		throw new Error("No segments with station data found");
	}

	hashParams.set("soid", firstSegmentWithHalte.halte[0].id);
	hashParams.set("zoid", lastSegmentWithHalte.halte.at(-1)!.id);

	// Add date information from the booking
	if (vbidRequest.data.hinfahrtDatum) {
		hashParams.set("hd", vbidRequest.data.hinfahrtDatum);
	}

	newUrl.hash = hashParams.toString();

	return newUrl.toString();
}
