import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { journeys } from "../journeys/journeys";
import { parseUrl } from "../parseUrl";
import { splitJourney } from "../splitJourney/splitJourney";
import { t } from "@/utils/trpc-init";

const appRouter = t.router({
	journeys,
	splitJourney,
	parseUrl,
});

export type AppRouter = typeof appRouter;

const handler = (req: Request) =>
	fetchRequestHandler({
		endpoint: "/api",
		req,
		router: appRouter,
		onError(opts) {
			console.error("TRPC Error", opts.error.message);
		},
	});

export { handler as GET, handler as POST };
