import type { VendoStation } from "@/utils/schemas";

export interface TrainLine {
	name?: string;
	product?: string;
}

export interface SplitPoint {
	departure: Date;
	arrival: Date;
	station: VendoStation;
	trainLine?: TrainLine;
	loadFactor?: unknown;
	legIndex: number;
	stopIndex: number;
}
