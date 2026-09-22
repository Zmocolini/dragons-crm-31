import { relations } from "drizzle-orm/relations";
import { couriers, duplicatePairs } from "./schema";

export const duplicatePairsRelations = relations(duplicatePairs, ({one}) => ({
	courier_courierBId: one(couriers, {
		fields: [duplicatePairs.courierBId],
		references: [couriers.id],
		relationName: "duplicatePairs_courierBId_couriers_id"
	}),
	courier_courierAId: one(couriers, {
		fields: [duplicatePairs.courierAId],
		references: [couriers.id],
		relationName: "duplicatePairs_courierAId_couriers_id"
	}),
}));

export const couriersRelations = relations(couriers, ({many}) => ({
	duplicatePairs_courierBId: many(duplicatePairs, {
		relationName: "duplicatePairs_courierBId_couriers_id"
	}),
	duplicatePairs_courierAId: many(duplicatePairs, {
		relationName: "duplicatePairs_courierAId_couriers_id"
	}),
}));