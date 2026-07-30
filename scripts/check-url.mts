/** Asserts the pooled-connection-string normaliser. */
import { normalisePooledUrl } from "../src/lib/db-url.ts";

const cases: [string, string, boolean][] = [
  ["Neon pooled, no flag", "postgresql://a:b@ep-x-pooler.eu.aws.neon.tech/db?sslmode=require", true],
  ["Neon pooled, flag already present", "postgresql://a:b@ep-x-pooler.eu.aws.neon.tech/db?pgbouncer=true", true],
  ["Neon direct (unpooled) is left alone", "postgresql://a:b@ep-x.eu.aws.neon.tech/db?sslmode=require", false],
  ["local dev is left alone", "postgresql://postgres:postgres@127.0.0.1:55432/risk", false],
  ["unparseable input is handed back", "definitely-not-a-url", false],
];

let failures = 0;
for (const [label, input, wantFlag] of cases) {
  const out = normalisePooledUrl(input);
  const has = /[?&]pgbouncer=true/.test(out);
  if (has === wantFlag) console.log(`  ok    ${label}`);
  else {
    failures++;
    console.error(`  FAIL  ${label} — got ${out}`);
  }
}
// sslmode must survive the rewrite, or TLS quietly drops.
const kept = normalisePooledUrl("postgresql://a:b@ep-x-pooler.h/db?sslmode=require");
if (/sslmode=require/.test(kept)) console.log("  ok    sslmode is preserved");
else { failures++; console.error(`  FAIL  sslmode was dropped — ${kept}`); }

console.log(failures ? `\nFAILED — ${failures}` : "\nPooled-URL normalisation is correct.");
process.exit(failures ? 1 : 0);
