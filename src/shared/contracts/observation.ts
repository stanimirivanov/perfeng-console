/** A current read with a bounded display lifetime, in milliseconds. */
export interface Observation<Value> {
  value: Value;
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

export interface ArtifactClaim {
  id: string;
  runId: string;
  kind: string;
  sha256: string;
  sizeBytes: number;
  mediaType: string;
  format: string;
}
export type ArtifactObservation = { status: 'available'; artifacts: ArtifactClaim[] } | { status: 'unavailable' };
