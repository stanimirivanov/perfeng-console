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
