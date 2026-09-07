import { ConvexError, v } from "convex/values";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import { compareProcurement } from "../src/domain/procurement";
import { query } from "./_generated/server";
import {
  exampleValidator,
  procurementComparisonValidator,
  procurementRequestValidator,
  supplierOfferValidator,
} from "./validators";

const MAX_OFFERS = 4;
const MAX_STRING_LENGTH = 160;

function validateStringLength(value: string, field: string) {
  if (value.length > MAX_STRING_LENGTH) {
    throw new ConvexError({
      code: "INPUT_TOO_LONG",
      field,
      maxLength: MAX_STRING_LENGTH,
    });
  }
}

export const calculate = query({
  args: {
    request: procurementRequestValidator,
    offers: v.array(supplierOfferValidator),
  },
  returns: procurementComparisonValidator,
  handler: async (_ctx, args) => {
    if (args.offers.length > MAX_OFFERS) {
      throw new ConvexError({
        code: "TOO_MANY_OFFERS",
        maxOffers: MAX_OFFERS,
      });
    }

    validateStringLength(args.request.ingredient, "request.ingredient");
    validateStringLength(args.request.specification, "request.specification");
    for (const [index, offer] of args.offers.entries()) {
      validateStringLength(offer.id, `offers[${index}].id`);
      validateStringLength(offer.supplier, `offers[${index}].supplier`);
      validateStringLength(offer.ingredient, `offers[${index}].ingredient`);
      validateStringLength(
        offer.specification,
        `offers[${index}].specification`,
      );
    }

    return compareProcurement(args.request, args.offers);
  },
});

export const example = query({
  args: {},
  returns: exampleValidator,
  handler: async () => ({
    request: riceRequest,
    offers: riceOffers,
  }),
});
