import { v } from "convex/values";
import {
  extractedOfferValidator,
  researchStatusValidator,
} from "./researchValidators";
export const documentKind = v.union(
  v.literal("image"),
  v.literal("pdf"),
  v.literal("image_us"),
  v.literal("pdf_us"),
);
export const documentResult = v.object({
  documentType: v.union(
    v.literal("quotation"),
    v.literal("purchase"),
    v.literal("list"),
    v.literal("unknown"),
  ),
  transcript: v.string(),
  offer: extractedOfferValidator,
});
export const documentRun = v.object({
  id: v.id("documentRuns"),
  kind: documentKind,
  createdAt: v.number(),
  status: researchStatusValidator,
  result: v.union(documentResult, v.null()),
  error: v.union(v.string(), v.null()),
});
