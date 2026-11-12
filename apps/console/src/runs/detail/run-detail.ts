import { Component, input, inject, ElementRef, afterNextRender } from '@angular/core';
import type { RunDetail, ArtifactObservation } from '#perfeng/contracts';

@Component({
  selector: 'app-run-detail',
  template: `
    <section aria-labelledby="detail-title">
      <h3 id="detail-title" tabindex="-1">Current Run</h3>
      <p>Execution completion is not a performance PASS.</p>
      <dl class="run-summary">
        <dt>Run ID</dt><dd>{{ run().id }}</dd>
        <dt>State</dt><dd>{{ run().state }}</dd>
        <dt>Revision</dt><dd>{{ run().revision }}</dd>
        <dt>Created at</dt><dd>{{ run().createdAt }}</dd>
        <dt>Updated at</dt><dd>{{ run().updatedAt }}</dd>
        <dt>Finished at</dt><dd>{{ run().finishedAt ?? 'UNKNOWN — no finish timestamp' }}</dd>
        <dt>Failure code</dt><dd>{{ run().failureCode ?? 'None recorded' }}</dd>
      </dl>
      <p>Execution identity: UNKNOWN — not exposed by this API.</p>
      <details>
        <summary>Permitted state transitions</summary>
        <p>Contract topology, not a record of transitions taken by this Run.</p>
        <table>
          <caption>Allowed transitions from the pinned contract</caption>
          <thead><tr><th scope="col">From</th><th scope="col">Allowed next states</th></tr></thead>
          <tbody>@for (state of states(); track state) {
            <tr><th scope="row">{{ state }}</th><td>{{ run().transitions[state]?.join(', ') || 'Terminal — no outgoing transitions' }}</td></tr>
          }</tbody>
        </table>
      </details>
      <section aria-label="Session observations">
        <h4>Session observations</h4>
        <p>Last 20 snapshots seen in this session, not a durable event history. Unobserved revisions are unknown.</p>
        <ol>@for (entry of observations(); track entry.revision) {
          <li>Revision {{ entry.revision }} · {{ entry.state }} · Run updated at {{ entry.updatedAt }}</li>
        }</ol>
      </section>
      <h4>Artifact references</h4>
      <p>SHA-256 claim (bytes not verified)</p>
      @if (artifacts().status === 'unavailable') { <p>Artifact observation unavailable.</p> }
      @else {
        @if (claims().length === 0) { <p>No artifact references returned for this Run.</p> }
        @for (claim of claims(); track claim.id) {
          <dl class="run-summary artifact-claim">
            <dt>Artifact ID</dt><dd>{{ claim.id }}</dd>
            <dt>Kind</dt><dd>{{ claim.kind }}</dd>
            <dt>SHA-256</dt><dd>{{ claim.sha256 }}</dd>
            <dt>Size in bytes</dt><dd>{{ claim.sizeBytes }}</dd>
            <dt>Media type</dt><dd>{{ claim.mediaType }}</dd>
            <dt>Format</dt><dd>{{ claim.format }}</dd>
          </dl>
        }
      }
      <p>Artifact contents, verified provenance and report verdicts are unavailable in this view.</p>
    </section>
  `,
})
export class RunDetailView {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>('#detail-title')?.focus());
  }
  readonly run = input.required<RunDetail>();
  readonly artifacts = input.required<ArtifactObservation>();
  readonly observations = input.required<readonly { revision: number; state: string; updatedAt: string }[]>();
  states() { return Object.keys(this.run().transitions); }
  claims() { const value = this.artifacts(); return value.status === 'available' ? value.artifacts : []; }
}
