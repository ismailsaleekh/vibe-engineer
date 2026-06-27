// Independent adversarial probe of fail-closed integrity (revalidator-owned).
import { applyFailClosedRule } from "/Users/lizavasilyeva/work/vibe-engineer/scripts/ci/quality/lib/deterministic-failure.mjs";
import { auditDeclaredDependencies, auditImportSpecifiers } from "/Users/lizavasilyeva/work/vibe-engineer/scripts/ci/quality/lib/dependency-audit.mjs";
import { assertValid } from "/Users/lizavasilyeva/work/vibe-engineer/scripts/quality/lib/schema-validator.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SC = "/Users/lizavasilyeva/work/vibe-engineer/scripts/quality/schemas";
let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log(`[OK] ${name} ${detail||""}`); } else { fail++; console.log(`[FAIL] ${name} ${detail||""}`); } }

// N7: advisory flag CANNOT weaken a hard failure (missing set non-empty)
const r7a = applyFailClosedRule({ expectedFamilies: ["p0","p9"], registeredAndRunning: ["p0"], advisory: false });
const r7b = applyFailClosedRule({ expectedFamilies: ["p0","p9"], registeredAndRunning: ["p0"], advisory: true });
check("N7 hard fail (no advisory)", r7a.verdict==="fail" && r7a.exitCode===2 && JSON.stringify(r7a.missingFamilies)==='["p9"]');
check("N7 advisory IGNORED (still fail)", r7b.verdict==="fail" && r7b.exitCode===2 && r7b.advisoryIgnored===true);

// N6: dynamic/latest dependency rejected
let n6latest=false, n6star=false;
try { auditDeclaredDependencies([{name:"x",spec:"latest"}]); } catch { n6latest=true; }
try { auditDeclaredDependencies([{name:"x",spec:"*"}]); } catch { n6star=true; }
check("N6 'latest' rejected", n6latest);
check("N6 '*' rejected", n6star);
const viol = auditImportSpecifiers(["npx-bogus","@undeclared/pkg","node:fs","@vibe-engineer/mechanical-gates/aggregate"], ["@vibe-engineer/mechanical-gates/aggregate"]);
check("N6 undeclared import flagged", JSON.stringify(viol.sort())==='["@undeclared/pkg","npx-bogus"]');

// Malformed manifest: extra property (additionalProperties:false)
const manifestSchema = JSON.parse(await readFile(path.join(SC,"expected-families.manifest.schema.json"),"utf8"));
let m1=false;
try { assertValid({schemaVersion:"quality.expected-families/1",expectedFamilies:["p0"],description:"x",BOGUS:true}, manifestSchema, "m1"); } catch { m1=true; }
check("Malformed manifest extra-prop rejected", m1);
// Malformed manifest: wrong schemaVersion (const)
let m2=false;
try { assertValid({schemaVersion:"WRONG",expectedFamilies:["p0"],description:"x"}, manifestSchema, "m2"); } catch { m2=true; }
check("Malformed manifest wrong-schemaVersion rejected", m2);
// Malformed manifest: missing required
let m3=false;
try { assertValid({schemaVersion:"quality.expected-families/1",expectedFamilies:["p0"]}, manifestSchema, "m3"); } catch { m3=true; }
check("Malformed manifest missing-required rejected", m3);
// Malformed manifest: bad family pattern
let m4=false;
try { assertValid({schemaVersion:"quality.expected-families/1",expectedFamilies:["q9"],description:"x"}, manifestSchema, "m4"); } catch { m4=true; }
check("Malformed manifest bad-family-pattern rejected", m4);
// Valid manifest passes (control)
let m5ok=true;
try { assertValid({schemaVersion:"quality.expected-families/1",expectedFamilies:["p0","p1","p2"],description:"x"}, manifestSchema, "m5"); } catch { m5ok=false; }
check("Valid manifest passes (control)", m5ok);

// Missing manifest: readJson on non-existent path throws ENOENT (the path loadQualityContext uses)
let m6=false, m6msg="";
try { await readFile(path.join(SC,"..","expected-families.manifest-NONEXISTENT.json"),"utf8"); } catch (e) { m6=true; m6msg=e.code; }
check("Missing manifest -> ENOENT throw", m6 && m6msg==="ENOENT", `(${m6msg})`);

console.log(`\nADVERSARIAL PROBE: ${pass} ok / ${fail} fail`);
process.exit(fail>0?1:0);
