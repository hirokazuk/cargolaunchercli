import { describe, expect, test } from "bun:test";
import { listAntTargetNamesFromXml } from "./xml-targets";

describe("listAntTargetNamesFromXml", () => {
  test("extracts target names", () => {
    const xml = `<?xml version="1.0"?><project>
      <target name="alpha"/>
      <target name="beta"></target>
    </project>`;
    expect(listAntTargetNamesFromXml(xml)).toEqual(["alpha", "beta"]);
  });

  test("invalid xml returns empty", () => {
    expect(listAntTargetNamesFromXml("not xml")).toEqual([]);
  });
});
