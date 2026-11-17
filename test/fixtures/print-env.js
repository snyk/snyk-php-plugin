// Stand-in for a tool the plugin spawns. Prints variable names and the values
// of test-owned variables only, so no real secret value can reach CI logs.
// With --fail-if-snyk-env it exits 1 when any SNYK_* variable is present.
const env = process.env;
const leaked = Object.keys(env).filter((key) => /^snyk_/i.test(key));
if (process.argv.includes('--fail-if-snyk-env') && leaked.length > 0) {
  process.exit(1);
}
process.stdout.write(
  JSON.stringify({
    keys: Object.keys(env),
    HTTP_PROXY: env.HTTP_PROXY,
    http_proxy: env.http_proxy,
    UNRELATED_VAR: env.UNRELATED_VAR,
  }),
);
