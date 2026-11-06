import type { Locator } from "@playwright/test";

/** Human-readable step recorded beside the browser action that proves it. */
export interface GuideStepDefinition {
  readonly title: string;
  readonly body: string;
}

/** Optional documentation behavior shared by guide and test-only page objects. */
export interface GuideNarrator {
  action(
    target: Locator,
    step: GuideStepDefinition,
    perform: () => Promise<void>,
  ): Promise<void>;
  result(target: Locator, step: GuideStepDefinition): Promise<void>;
}

export const performDocumentedAction = async (
  narrator: GuideNarrator | undefined,
  target: Locator,
  step: GuideStepDefinition,
  perform: () => Promise<void>,
): Promise<void> => {
  if (narrator === undefined) {
    await perform();
    return;
  }

  await narrator.action(target, step, perform);
};

export const documentResult = async (
  narrator: GuideNarrator | undefined,
  target: Locator,
  step: GuideStepDefinition,
): Promise<void> => {
  await narrator?.result(target, step);
};
