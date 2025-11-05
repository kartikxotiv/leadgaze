import { leadActions, LeadFeature } from "./action/lead.actions";

const modules = {leads: leadActions,} as const;

export type Module = keyof typeof modules;
export type ModuleFeatures = {leads: LeadFeature;}
export type Feature<M extends Module> = ModuleFeatures[M];

export default modules;