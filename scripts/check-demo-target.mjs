// Deployment-scoped keys use type:name|secret in the installed Convex CLI.
const key = process.env.CONVEX_DEPLOY_KEY ?? "";
if (!/^dev:incredible-wolverine-122\|[^\s|]+$/.test(key)) {
  console.error("Set CONVEX_DEV_DEPLOY_KEY to a deployment key for dev incredible-wolverine-122. No deployment was attempted.");
  process.exit(1);
}
console.log("target: dev (incredible-wolverine-122, development demo)");
