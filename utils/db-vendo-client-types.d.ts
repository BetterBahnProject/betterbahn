declare module "db-vendo-client" {
	interface VendoClient {
		journeys(
			from: string,
			to: string,
			options: SearchJourneysOptions
		): Promise<unknown>;
	}

	export function createClient(
		dbProfile: unknown,
		userAgent: string
	): VendoClient;

	export interface SearchJourneysOptions {
		results: number;
		stopovers: boolean;
		notOnlyFastRoutes: boolean;
		remarks: boolean;
		transfers: number;
		firstClass: boolean;
		departure?: Date;
		loyaltyCard?: {
			type: string;
			discount: number;
			class: number;
		};
		age?: number;
		deutschlandTicketDiscount?: boolean;
		deutschlandTicketConnectionsOnly?: boolean;
	}
}

declare module "db-vendo-client/format/loyalty-cards" {
	export const data: Record<string, string>;
}

declare module "db-vendo-client/p/db/index" {
	export const profile: unknown;
}
