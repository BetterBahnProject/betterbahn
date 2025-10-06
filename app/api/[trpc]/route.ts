import { t } from "@/utils/trpc-init";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { combi } from "../combi/combi";

const appRouter = t.router({ combi });

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
