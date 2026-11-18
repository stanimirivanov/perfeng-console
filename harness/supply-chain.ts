import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Severity = 'info' | 'low' | 'moderate' | 'high' | 'critical';
interface Finding {
  readonly version: string;
  readonly paths: readonly string[];
  readonly dev: boolean;
  readonly bundled: boolean;
}
interface Advisory {
  readonly advisory: string;
  readonly package: string;
  readonly severity: Severity;
  readonly findings: readonly Finding[];
}
interface RiskException {
  readonly advisory: string;
  readonly package: string;
  readonly version: string;
  readonly validFrom: number;
  readonly expiresAt: number;
  readonly trackingIssue: string;
}
export interface AuditEvaluation {
  readonly ok: boolean;
  readonly messages: readonly string[];
}
const severities: readonly Severity[] = ['info', 'low', 'moderate', 'high', 'critical'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, names: string) => Object.keys(value).sort().join(',') === names;
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
const ghsa = (value: unknown): value is string => typeof value === 'string' && /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(value);
const packageName = (value: unknown): value is string => typeof value === 'string' && value.length <= 214 && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value);
const version = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
class AuditRefusal extends Error {}
const refuse = (reason: string): never => { throw new AuditRefusal(reason); };
const isSeverity = (value: unknown): value is Severity => severities.some(severity => severity === value);

function instant(value: unknown): number {
  if (typeof value !== 'string') return refuse('Invalid exception date.');
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed) || new Date(parsed).toISOString() !== value) return refuse('Use canonical UTC exception dates.');
  return parsed;
}

function exceptions(value: unknown, now: number): readonly RiskException[] {
  if (
    !record(value) || !exact(value, 'exceptions,schemaVersion') ||
    value.schemaVersion !== 1 || !Array.isArray(value.exceptions) || value.exceptions.length > 1
  ) return refuse('Invalid exception policy.');
  return value.exceptions.map(item => {
    if (
      !record(item) ||
      !exact(item, 'advisory,expiresAt,package,reason,review,scope,severity,trackingIssue,validFrom,version') ||
      !ghsa(item.advisory) || !packageName(item.package) || !version(item.version) ||
      item.severity !== 'high' || item.scope !== 'root-development-only' ||
      item.review !== 'human-review-and-merge-required' ||
      typeof item.reason !== 'string' || item.reason.length < 20 || item.reason.length > 2048 ||
      typeof item.trackingIssue !== 'string' ||
      !/^https:\/\/github\.com\/stanimirivanov\/perfeng-console\/issues\/[1-9]\d*$/.test(item.trackingIssue)
    ) return refuse('Exception must name an exact reviewed root-development high risk.');
    const validFrom = instant(item.validFrom);
    const expiresAt = instant(item.expiresAt);
    if (expiresAt <= validFrom || expiresAt - validFrom > 14 * 86400000) {
      return refuse('Exception window must be positive and at most 14 days.');
    }
    if (now < validFrom || now >= expiresAt) {
      return refuse('Exception is outside its review window; remove or explicitly review it.');
    }
    return { advisory: item.advisory, package: item.package, version: item.version, validFrom, expiresAt, trackingIssue: item.trackingIssue };
  });
}

function advisories(value: unknown, status: number): readonly Advisory[] {
  if (!record(value) || !exact(value, 'advisories,metadata')) return refuse('Scanner report is incomplete.');
  const metadata = value.metadata;
  const rawAdvisories = value.advisories;
  if (
    !record(rawAdvisories) || !record(metadata) ||
    !exact(metadata, 'dependencies,devDependencies,optionalDependencies,totalDependencies,vulnerabilities')
  ) return refuse('Scanner report is incomplete.');
  const counts = metadata.vulnerabilities;
  if (
    !record(counts) || !exact(counts, 'critical,high,info,low,moderate') ||
    severities.some(severity => !integer(counts[severity])) ||
    ['dependencies', 'devDependencies', 'optionalDependencies', 'totalDependencies'].some(name => !integer(metadata[name]))
  ) return refuse('Scanner metadata is invalid.');
  const entries = Object.entries(rawAdvisories);
  if (entries.length > 1000 || (entries.length === 0 ? status !== 0 : status !== 1)) {
    return refuse('Scanner status and findings disagree.');
  }
  const seen = new Set<string>();
  const output = entries.map(([id, item]): Advisory => {
    if (
      !record(item) || !integer(item.id) || String(item.id) !== id ||
      !ghsa(item.github_advisory_id) || seen.has(item.github_advisory_id) ||
      !packageName(item.module_name) || !isSeverity(item.severity) ||
      !Array.isArray(item.findings) || item.findings.length < 1 || item.findings.length > 128
    ) return refuse('Scanner advisory is incomplete.');
    seen.add(item.github_advisory_id);
    const findings = item.findings.map((finding): Finding => {
      if (
        !record(finding) || !version(finding.version) ||
        typeof finding.dev !== 'boolean' || typeof finding.optional !== 'boolean' ||
        typeof finding.bundled !== 'boolean' || !Array.isArray(finding.paths) ||
        finding.paths.length < 1 || finding.paths.length > 10000 ||
        finding.paths.some(path => typeof path !== 'string' || !path.startsWith('.>') ||
          path.length > 4096 || /[\x00-\x1f\x7f]/.test(path)) ||
        new Set(finding.paths).size !== finding.paths.length
      ) return refuse('Scanner finding is incomplete.');
      return { version: finding.version, paths: finding.paths, dev: finding.dev, bundled: finding.bundled };
    });
    return { advisory: item.github_advisory_id, package: item.module_name, severity: item.severity, findings };
  });
  if (severities.some(severity => counts[severity] !== output.filter(item => item.severity === severity).length)) {
    return refuse('Scanner severity totals do not reconcile.');
  }
  return output;
}

/** Evaluate complete raw scanner evidence; exceptions accept risk, never erase findings. */
export function evaluateAudit(report: unknown, policy: unknown, now: number, scannerStatus: number): AuditEvaluation {
  const messages: string[] = [];
  try {
    if (!integer(now) || Number.isNaN(new Date(now).getTime()) || ![0, 1].includes(scannerStatus)) return refuse('Scanner failed or the local clock is invalid.');
    const findings = advisories(report, scannerStatus);
    for (const item of findings) {
      const versions = [...new Set(item.findings.map(finding => finding.version))].join(',');
      const paths = item.findings.reduce((count, finding) => count + finding.paths.length, 0);
      messages.push(`${item.severity.toUpperCase()} ${item.package}@${versions} ${item.advisory}: ${paths} path(s); finding remains present.`);
    }
    const risks = exceptions(policy, now);
    const used = new Set<RiskException>();
    let ok = true;
    for (const item of findings) {
      if (item.severity !== 'high' && item.severity !== 'critical') continue;
      const accepted = risks.find(risk =>
        item.severity === 'high' && item.advisory === risk.advisory && item.package === risk.package &&
        item.findings.every(finding => !finding.bundled && finding.dev && finding.version === risk.version));
      if (accepted) {
        used.add(accepted);
        messages.push(`RISK ACCEPTED for this root-development check until ${new Date(accepted.expiresAt).toISOString()}; ${accepted.trackingIssue}. Not fixed; human review/merge required.`);
      } else { ok = false; messages.push('Unaccepted high/critical risk blocks delivery.'); }
    }
    if (risks.some(risk => !used.has(risk))) return refuse('Unused exception must be retired; do not retain a dormant waiver.');
    return { ok, messages };
  } catch (error) {
    return { ok: false, messages: [...messages, error instanceof AuditRefusal ? error.message : 'Invalid scanner/policy data.'] };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
    if (process.argv.length !== 2 || realpathSync(process.cwd()) !== root) refuse('Run the root-only audit policy without arguments from the Console repository root.');
    const audit = spawnSync('pnpm', ['audit', '--json'], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    if (audit.error || audit.signal || audit.status === null) throw new Error('Scanner did not complete.');
    const result = evaluateAudit(JSON.parse(audit.stdout), JSON.parse(readFileSync(new URL('./audit-exceptions.json', import.meta.url), 'utf8')), Date.now(), audit.status);
    for (const message of result.messages) process.stdout.write(message + '\n');
    if (!result.ok) { process.stdout.write('Next: inspect pnpm audit --json locally; review the policy or retire its exception. Guide: docs/development/dependency-policy.md.\n'); process.exitCode = 1; }
  } catch (error) {
    const reason = error instanceof AuditRefusal ? error.message : 'Audit unavailable or invalid.';
    process.stderr.write(reason + ' Inspect pnpm audit --json locally; rerun make supply-chain. Guide: docs/development/dependency-policy.md.\n');
    process.exitCode = 1;
  }
}
