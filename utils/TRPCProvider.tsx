"use client";

import type { AppRouter } from "@/app/api/[trpc]/route";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnMount: false,
			refetchOnReconnect: false,
			refetchOnWindowFocus: false,
			refetchInterval: false,
			refetchIntervalInBackground: false,
		},
	},
});

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchStreamLink({
			transformer: SuperJSON,
			url: `http://localhost:3000/api`,
		}),
	],
});

export function TRPCReactProvider(
	props: Readonly<{
		children: React.ReactNode;
	}>
) {
	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				{props.children}
			</TRPCProvider>
		</QueryClientProvider>
	);
}
