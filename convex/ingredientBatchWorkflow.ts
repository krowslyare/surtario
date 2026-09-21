import {
  defineWorkflow,
  vWorkflowId,
  vResultValidator,
} from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { FunctionReturnType } from "convex/server";
const args = { batchId: v.id("ingredientBatches"), generation: v.number() };
// Each lane waits for a whole research workflow, not just its asynchronous start.
export const lane = defineWorkflow(components.workflow, {
  args,
  returns: v.null(),
  workpoolOptions: { retryActionsByDefault: false },
}).handler(async (step, input): Promise<null> => {
  for (let i = 0; i < 30; i++) {
    const next: FunctionReturnType<typeof internal.ingredientBatches.claim> =
      await step.runMutation(internal.ingredientBatches.claim, input);
    if (!next) return null;
    try {
      await step.runWorkflow(internal.sourcingWorkflow.run, next);
    } catch {
      await step.runMutation(internal.sourcing.finish, {
        ...next,
        failed: true,
        summary:
          "Research could not finish. Saved findings remain available. You can retry this ingredient independently.",
      });
    }
    await step.runMutation(internal.ingredientBatches.settle, {
      ...input,
      caseId: next.caseId,
    });
  }
  return null;
});
export const run = defineWorkflow(components.workflow, {
  args,
  returns: v.null(),
}).handler(async (step, input): Promise<null> => {
  const lanes = await Promise.allSettled([
    step.runWorkflow(internal.ingredientBatchWorkflow.lane, input),
    step.runWorkflow(internal.ingredientBatchWorkflow.lane, input),
  ]);
  if (lanes.some((result) => result.status === "rejected"))
    throw new Error("An ingredient lane was interrupted");
  return null;
});
export const completed = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object(args),
  },
  returns: v.null(),
  handler: async (ctx, { context, result }) => {
    const batch = await ctx.db.get(context.batchId);
    if (!batch || batch.generation !== context.generation) return null;
    // Closing the coordinator and launching any late retry happen in the same transaction.
    await ctx.runMutation(internal.ingredientBatches.finishCoordinator, {
      ...context,
      failed: result.kind !== "success",
    });
    return null;
  },
});
