// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { usRiceOffers, usRiceRequest } from "../fixtures/procurement";
import { decisionActions } from "../src/domain/decisionActions";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
const context = { priority: "cash" as const, budgetCents: 5000, dailyUsage: null, stockQuantity: null, maxCoverageDays: null, preferredOfferId: null };
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  const comparison = await t.mutation(api.comparisons.save, { token, clientId: crypto.randomUUID(), id: null, expectedRevision: 0, request: usRiceRequest, offers: usRiceOffers.map((o,i) => i === 0 ? {...o,minimumPackages:5} : o), selectedOfferId: null });
  const action = {kind:"minimum" as const, offerId: usRiceOffers[0].id, expectedRevision:comparison.revision, context};
  const draft = await t.mutation(api.quotationMail.create, {token, comparisonId:comparison.id, clientId:crypto.randomUUID(), decisionAction:action});
  await t.run(ctx => ctx.db.insert("quotationReplies", {requestId:draft.id,eventId:"test-event",messageId:"test-reply",threadId:"test-thread",from:"test@example.test",text:"We confirm a minimum of 2 packs; other terms unchanged.",receivedAt:"2026-09-17T00:00:00Z"}));
  const confirmation={token,requestId:draft.id,messageId:"test-reply",comparisonId:comparison.id,expectedRevision:comparison.revision,offerId:action.offerId,minimumPackages:2,evidenceQuote:"We confirm a minimum of 2 packs; other terms unchanged.",context,confirmed:true as const};
  return {t,comparison,action,draft,confirmation};
}
test("minimum action is grounded, private alternatives stay out of the message, and partial confirmation is durable and idempotent",async()=>{
 const {t,comparison,draft,confirmation}=await setup();
 expect(draft.decisionAction).toMatchObject({kind:"minimum",comparisonRevision:1,proposedMinimumPackages:2,evidenceOfferIds:[usRiceOffers[0].id]});
 expect(draft.text).toContain("2 packs");expect(draft.text).not.toContain("Supplier B");expect(draft.text).not.toContain("35.00");
 const applied=await t.mutation(api.quotationMail.confirmReplyDelivery,confirmation);
 expect(applied.comparison.offers[0]).toEqual({...comparison.offers[0],minimumPackages:2});
 expect(applied.comparison.offers[1]).toEqual(comparison.offers[1]);
 expect(applied.comparison.sources[usRiceOffers[0].id].original).toEqual(comparison.sources[usRiceOffers[0].id].original);
 expect(applied.confirmation.before.alternatives[0].affordable).toBe(false);
 expect(applied.confirmation.after.alternatives[0].affordable).toBe(true);
 // B remains cheaper: a successful term confirmation need not change the winner.
 expect(applied.confirmation.after.recommendedOfferId).toBe(usRiceOffers[1].id);
 expect(applied.comparison.selectedOfferId).toBeNull();
 expect((await t.mutation(api.quotationMail.confirmReplyDelivery,confirmation)).alreadyApplied).toBe(true);
 expect(await t.query(api.quotationMail.listDeliveryConfirmations,{token,comparisonId:comparison.id})).toHaveLength(1);
 await expect(t.mutation(api.quotationMail.confirmReplyDelivery,{...confirmation,minimumPackages:3})).rejects.toThrow(/different data/);
});
test("stale actions cannot send or confirm and other sessions cannot apply a reply",async()=>{
 const {t,comparison,draft,confirmation}=await setup();
 await expect(t.mutation(api.quotationMail.confirmReplyDelivery,{...confirmation,token:"b".repeat(64)})).rejects.toThrow(/unavailable/);
 await t.run(ctx=>ctx.db.patch(comparison.id,{revision:2}));
 await expect(t.mutation(internal.quotationMail.reserveSend,{token,id:draft.id,expectedRevision:draft.revision,confirmed:true})).rejects.toThrow(/comparison changed/);
 await expect(t.mutation(api.quotationMail.confirmReplyDelivery,{...confirmation,expectedRevision:2})).rejects.toThrow(/earlier comparison/);
});
test("a non-improving minimum reply is recorded without inventing viability",async()=>{
 const {t,confirmation}=await setup();
 await t.run(async ctx=>{const reply=await ctx.db.query("quotationReplies").withIndex("by_messageId",q=>q.eq("messageId","test-reply")).unique();await ctx.db.patch(reply!._id,{text:"Minimum remains 5 packs."});});
 const applied=await t.mutation(api.quotationMail.confirmReplyDelivery,{...confirmation,minimumPackages:5,evidenceQuote:"Minimum remains 5 packs."});
 expect(applied.confirmation.after.alternatives[0].affordable).toBe(false);
 expect(applied.confirmation.before.recommendedOfferId).toBe(applied.confirmation.after.recommendedOfferId);
});
test("freight questions use the computed threshold; no minimum action without confirmed constraints",()=>{
 const offers=usRiceOffers.map((o,i)=>i===1?{...o,freightCents:null}:o);
 const actions=decisionActions(usRiceRequest,offers,context);
 expect(actions[0].kind).toBe("delivery");expect(actions[0].question).toMatch(/10.00/);
 expect(actions[0].question).not.toContain("Supplier A");
 expect(decisionActions(usRiceRequest,usRiceOffers.map(o=>({...o,minimumPackages:5})),{...context,budgetCents:null})).toEqual([]);
});
test("AI inquiry context contains only the target offer and rejects a stale proposal", async()=>{
 const {t,comparison,draft}=await setup();
 vi.stubEnv("QUOTATION_DRAFT_ENABLED","true");vi.stubEnv("OPENAI_API_KEY","test");vi.stubEnv("OPENAI_EXTRACTION_MODEL","test");
 const reservation=await t.mutation(internal.quotationMail.reserveInquiry,{token,id:draft.id,expectedRevision:draft.revision});
 expect(reservation.fresh).toBe(true);
 if(reservation.fresh){const payload=JSON.parse(reservation.context);expect(payload.offers).toHaveLength(1);expect(payload.offers[0].id).toBe(comparison.offers[0].id);expect(reservation.context).not.toContain("Supplier B");}
 await t.mutation(internal.quotationMail.finishInquiry,{id:draft.id,proposal:null});
 await t.run(ctx=>ctx.db.patch(comparison.id,{revision:2}));
 // Existing attempt remains available; sending is independently rejected after drift.
 await expect(t.mutation(internal.quotationMail.reserveSend,{token,id:draft.id,expectedRevision:draft.revision,confirmed:true})).rejects.toThrow(/comparison changed/);
});
test("repeating a contextual draft request recovers the same immutable proposal",async()=>{
 const {t,comparison,action,draft}=await setup();const clientId=await t.run(async ctx=>(await ctx.db.get(draft.id))!.clientId);
 const args={token,comparisonId:comparison.id,clientId,decisionAction:action};
 const first=await t.mutation(api.quotationMail.create,args);
 const again=await t.mutation(api.quotationMail.create,args);
 expect(again.id).toBe(first.id);
});
