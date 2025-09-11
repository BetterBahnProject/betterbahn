export interface QueryOptions {
	deutschlandTicketDiscount?: boolean;
	results: number;
	stopovers: boolean;
	firstClass: boolean;
	notOnlyFastRoutes: boolean;
	remarks: boolean;
	transfers: number;
	loyaltyCard?: {
		type: string;
		discount: number;
		class: number;
	};
	age?: number;
}
