// Exact package API sources: https://github.com/ngrx/platform/tree/22.0.1
// https://github.com/Effect-TS/effect/tree/effect%404.1.2/packages/effect/src
import { TestBed } from "@angular/core/testing";
import { patchState, signalStore, withState, withMethods } from "@ngrx/signals";
import { Effect, Fiber } from "effect";

it("session presentation state can be invalidated without retaining a previous value", () => {
  const Store = signalStore(withState({ observation: 42 as number | null }),
    withMethods(store => ({ invalidate: () => patchState(store, { observation: null }) })));
  const store = TestBed.runInInjectionContext(() => new Store());
  expect(store.observation()).toBe(42);
  store.invalidate();
  expect(store.observation()).toBeNull();
});

it("interrupting a read fiber aborts its transport signal", async () => {
  let aborted = false;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const read = Effect.tryPromise({
    try: signal => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => { aborted = true; reject(new Error("cancelled")); });
      started();
    }),
    catch: error => error,
  });
  const fiber = Effect.runFork(read);
  await ready;
  await Effect.runPromise(Fiber.interrupt(fiber));
  expect(aborted).toBe(true);
});
