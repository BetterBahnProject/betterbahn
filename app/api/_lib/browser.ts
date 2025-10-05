import {
	ReconResponse,
	reconResponseSchema,
	VerbindungResponse,
	VerbindungResponseSchema,
} from "@/utils/schemas";
import { validateJson } from "@/utils/validateJson";
import UserAgent from "user-agents";
import { z, ZodType } from "zod/v4";
import { Browser, HTTPResponse, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

/**
 * Sets a random user agent and viewport size for a Puppeteer page
 * @param page - The Puppeteer page instance
 */
export const setRandomUserAgent = async (page: Page): Promise<UserAgent> => {
	const randomUserAgent = new UserAgent();
	const { userAgent, platform, viewportWidth, viewportHeight } =
		randomUserAgent.data;

	await page.setUserAgent({
		userAgent,
		platform,
	});
	await page.setViewport({
		width: viewportWidth,
		height: viewportHeight,
	});

	return randomUserAgent;
};

/**
 * Sets up a new browser instance and page with random user agent.
 * @returns A tuple containing the browser and page instances.
 */
export const setupBrowserAndPage = async (): Promise<[Browser, Page]> => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	const randomUserAgent = await setRandomUserAgent(page);

	console.log(
		`🌐 Browser was setup with user agent "${randomUserAgent.data.userAgent}", platform "${randomUserAgent.data.platform}" and viewport ${randomUserAgent.data.viewportWidth}x${randomUserAgent.data.viewportHeight}.`
	);

	return [browser, page];
};

/**
 * Intercepts a specific bahn.de HTTP response and validates it against a schema.
 * @param page - The Puppeteer page instance.
 * @param schema - Zod schema to validate the response body against.
 * @param pathname - The URL pathname to wait for.
 * @param timeout - Timeout in milliseconds (default: 15000).
 * @returns The validated response data.
 */
export const interceptResponse = <T extends ZodType>(
	page: Page,
	schema: T,
	pathname: string,
	timeout = 15000
): Promise<z.output<typeof schema>> => {
	return new Promise((resolve, reject) => {
		// Set up a timeout to avoid waiting indefinitely
		const failTimer = setTimeout(() => {
			// Clean up the event listener to prevent memory leaks
			page.off("response", onPageResponse);

			reject(
				new Error(
					`Timeout of ${timeout}ms exceeded while awaiting response at "${pathname}".`
				)
			);
		}, timeout);

		async function onPageResponse(response: HTTPResponse) {
			const url = new URL(response.url());
			if (!url.host.includes("bahn.de") || url.pathname !== pathname) {
				return;
			}

			// Clear the timeout and clean up the event listener
			clearTimeout(failTimer);
			page.off("response", onPageResponse);

			try {
				const json = await response.json();
				resolve(validateJson(schema, json));
			} catch (error) {
				reject(error);
			}
		}

		// We're registering a function so we can unsubscribe once we got what we want.
		page.on("response", onPageResponse);
	});
};

export const interceptReconResponse = async (
	page: Page
): Promise<ReconResponse> => {
	const reconResponse = await interceptResponse(
		page,
		reconResponseSchema,
		"/web/api/angebote/recon"
	);
	console.log(`🌐 Browser has intercepted Recon response.`);
	return reconResponse;
};

export const interceptVerbindungResponse = async (
	page: Page,
	vbid: string
): Promise<VerbindungResponse> => {
	const verbindungResponse = await interceptResponse(
		page,
		VerbindungResponseSchema,
		"/web/api/angebote/verbindung/" + vbid
	);
	console.log(`🌐 Browser has intercepted Verbindung response.`);
	return verbindungResponse;
};

/**
 * Gets Recon and Verbindung responses by navigating to a bahn.de booking URL with a browser.
 * @param vbid - The journey ID to retrieve data for.
 * @returns A tuple containing the recon and verbindungen responses.
 */
export const getReconAndVerbindungenBrowserResponses = async (
	vbid: string
): Promise<[ReconResponse, VerbindungResponse]> => {
	const urlToVisit = `https://www.bahn.de/buchung/start?vbid=${vbid}`;
	const [browser, page] = await setupBrowserAndPage();

	console.log(`🌐 Browser is visiting "${urlToVisit}".`);

	let reconResponse: ReconResponse;
	let verbindungenResponse: VerbindungResponse;
	try {
		[reconResponse, verbindungenResponse] = await Promise.all([
			interceptReconResponse(page),
			interceptVerbindungResponse(page, vbid),
			page.goto(urlToVisit, {
				waitUntil: "networkidle0",
			}),
		]);
	} catch (error) {
		console.error(`❌ Error during browser operations:`, error);
		throw error;
	} finally {
		// Ensure the browser is closed even if an error occurs
		await browser.close();
		console.log(`🌐 Browser was closed.`);
	}

	return [reconResponse, verbindungenResponse];
};
