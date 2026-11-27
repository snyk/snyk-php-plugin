// Stand-in for a build tool. Prints the names (never values) of SNYK_* variables.
// With --fail-if-snyk-env it exits 1 when any SNYK_* variable is present.
const snykKeys = Object.keys(process.env).filter((key) => /^snyk_/i.test(key));
if (process.argv.includes('--fail-if-snyk-env') && snykKeys.length > 0) {
  process.exit(1);
}
process.stdout.write(JSON.stringify({ snykKeys }));
