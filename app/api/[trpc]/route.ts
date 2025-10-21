import { t } from "@/utils/trpc-init";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { analyzeJourney } from "../analyzeJourney";
import { getJourney } from "../getJourney/getJourney";

const appRouter = t.router({ getJourney, analyzeJourney });

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
