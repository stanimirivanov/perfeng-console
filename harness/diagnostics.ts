const corrections: Readonly<Record<string, string>> = {
  'OWN-01': 'Keep the implementation in its owning module; review any new role or public entry before admission.',
  'OWN-02': 'Move execution to the registered integration/composition owner; do not relabel a component or adapter.',
  'OWN-03': 'Use the reviewed I/O adapter and its existing capabilities; new native authority requires review.',
  'OWN-04': 'Keep DTOs/presentation runtime-free and use declaration-level import type.',
  'OWN-11': 'Use the owning feature public port; keep its private store/facade local.',
  'OWN-12': 'Use the reviewed provider only in Component.providers metadata.',
  'OWN-13': 'Use the exact tool entry and named members; review new permissions instead of widening an allowlist.',
  'public-import': 'Use the exact public alias for the owning boundary; keep relative imports within their owner.',
  'owner-cycle': 'Break the cross-owner dependency cycle through an inward public contract; do not suppress the cycle.',
  'dependency-graph': 'Correct the named dependency rule at its source; do not add a violation baseline.',
  imports: 'Align the named config with harness/imports.ts and preserve reviewed inheritance; never copy an unreviewed target.',
  'alias-document': 'Reconcile the reviewed alias table with publicImports; permission changes still require code review.',
};
// Source filenames/specifiers are untrusted text, not terminal or CI control lines.
const singleLine = (text: string) => text.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu,
  char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));

export function diagnostic(file: string, line: number, rule: string, reason: string,
  gate: 'architecture' | 'imports' | 'distribution' = 'architecture'): string {
  const correction = corrections[rule] ?? 'Correct the source boundary using its owner guidance; admission changes require review.';
  const command = gate === 'imports' ? 'make check-imports' : gate === 'distribution' ? 'make build' : 'make architecture';
  const guide = gate === 'imports' ? 'docs/IMPORTS.md' : 'docs/development/harness-rules.md';
  return `${singleLine(file)}:${line} [${singleLine(rule)}] ${singleLine(reason)} Next: ${correction} Rerun: ${command}. Guide: ${guide}.`;
}
