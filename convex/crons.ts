import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "check selected source watches",
  { minutes: 15 },
  internal.sourcingWatch.due,
  {},
);
export default crons;
