/** A current read paired with a bounded display lifetime. */
export interface Observation<Value> {
  value: Value;
  /** Duration in milliseconds, not an epoch timestamp; consumers account for read transit time. */
  validForMs: number;
}

export interface RunSummary {
  id: string;
  state: string;
  revision: number;
  updatedAt: string;
}

export interface RunDetail extends RunSummary {
  createdAt: string;
  finishedAt: string | null;
  failureCode: string | null;
  transitions: Readonly<Record<string, readonly string[]>>;
}

/** Provider metadata claims; the listed digest does not establish verification of artifact bytes. */
export interface ArtifactClaim {
  id: string;
  runId: string;
  kind: string;
  sha256: string;
  sizeBytes: number;
  mediaType: string;
  format: string;
}
/** Browser display availability derived from an admitted artifact read.
 * The BFF wire response instead carries artifacts inside an Observation freshness envelope.
 * Availability does not establish artifact-content integrity or authorize artifact-body access.
 */
export type ArtifactObservation = {
  status: 'available';
  artifacts: ArtifactClaim[];
} | { status: 'unavailable'; };
