# Perfeng UI intent

Confirmed by the project owner on 2026-11-06.

**Outcome.** Perfeng Console becomes the main UI for operating the continuous performance testing platform. The simulator gives maintainers controlled inputs and expected outcomes so they can build and verify the same workflows that engineers use on real runs.

**User.** Today the project owner can use a local release. At six months, a service engineer can sign in from her workstation and operate her team's services. At two years, several teams can work independently. Designated approvers manage baselines and platform operators grant or revoke service access.

**Why now.** A real CI run and a controlled scenario both need a trustworthy Run page. Building that shared experience lets the owner verify the platform while delivering a workflow engineers can use independently.

**Success.** Maya follows a CI link to a completed Perfeng run. She can identify the tested commit, see which approved baseline and policy version the run used, and judge whether a regression warrants investigation. She can rerun the approved suite against the same commit and baseline without the owner's help. Perfeng checks her access to the service and records that she requested the rerun. She can complete the whole journey without knowing Scenario Lab exists.

**Constraints.** A local single-operator release is sufficient to start. Shared use requires individual sign-in, service-scoped authorization on every read and write, and an audit trail. A direct link grants no access to another team's runs. Approving or retiring a baseline requires a permission distinct from rerunning a test.

**Out of scope for the service engineer's console workflow.** Teams author custom test scripts and provision new environments through Git or the CLI. Simulation remains a separately authorized tool for the project owner and platform maintainers.

## Decisions this forces

1. Make real Run detail, baseline comparison and rerun the first user-facing journey. When a maintainer injects a known slowdown, the resulting run must exercise the same Run page Maya uses.
2. Give CI a durable link to the Perfeng run. The control plane and public contracts must support service-scoped evidence reads, authorized reruns and actor attribution. The console and simulator consume those public interfaces.
3. Let an engineer register a service, select an existing environment and suite, and propose the configuration in a Git PR from the console. After review, merge and publication, she can launch the first run. A policy change follows the same review path. Older runs retain the exact published version they used.
4. Keep the simulator useful for release verification. Maintainers compare predefined expectations with actual platform outcomes. The engineer's rerun action always launches a real test.

## Open questions

The hosting arrangement, identity provider, Git repository that owns each configuration type, maintenance capacity and delivery budget remain open.
