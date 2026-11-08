import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  resetGuideOutput,
  discardGuideOutput,
} from "#perfeng/user-guide";
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export default class GuideReporter implements Reporter {
  private chapters: string[] = [];
  private invalid = false;
  onBegin() {
    if (process.env.PERFENG_GUIDE === "1") resetGuideOutput(process.cwd());
  }
  onTestEnd(test: TestCase, result: TestResult) {
    if (process.env.PERFENG_GUIDE !== "1" || !test.tags.includes("@user-guide"))
      return;
    if (result.status !== "passed" || result.retry !== 0) {
      this.invalid = true;
      return;
    }
    const definitions = result.attachments.filter(
      (a) => a.name === "guide-step",
    );
    const images = result.attachments.filter((a) => a.name === "guide-image");
    if (!definitions.length || definitions.length !== images.length) {
      this.invalid = true;
      return;
    }
    const dir = resolve("dist/user-guide");
    const chapter = this.chapters.length + 1;
    let body = "<section><h2>" + escape(test.title) + "</h2>";
    definitions.forEach((d, i) => {
      if (!d.body) {
        this.invalid = true;
        return;
      }
      const step = JSON.parse(d.body.toString()) as {
        title: string;
        body: string;
      };
      const image = images[i]!,
        name = `chapter-${chapter}-step-${i + 1}.png`;
      if (image.body) writeFileSync(resolve(dir, name), image.body);
      else if (image.path) copyFileSync(image.path, resolve(dir, name));
      else {
        this.invalid = true;
        return;
      }
      body +=
        "<h3>" +
        escape(step.title) +
        "</h3><p>" +
        escape(step.body) +
        '</p><img alt="' +
        escape(step.title) +
        '" src="' +
        name +
        '">';
    });
    this.chapters.push(body + "</section>");
  }
  onEnd(result: FullResult) {
    if (process.env.PERFENG_GUIDE !== "1") return;
    if (result.status !== "passed" || this.invalid || !this.chapters.length) {
      discardGuideOutput(process.cwd());
      throw Error("Guide incomplete; no publishable artifact.");
    }
    mkdirSync("dist/user-guide", { recursive: true });
    writeFileSync(
      "dist/user-guide/index.html",
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>Perfeng operator guide</title><h1>Perfeng operator guide</h1><p>Generated from passing browser journeys. Scaffold orientation only; no connected platform evidence.</p>' +
        this.chapters.join("") +
        "</html>",
    );
  }
}
