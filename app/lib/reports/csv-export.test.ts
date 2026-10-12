import assert from "node:assert/strict";
import test from "node:test";
import { serializeCsv } from "./csv-export";

test("serializes CSV with standard quoting, commas, quotes, and line breaks", () => {
  assert.equal(
    serializeCsv([
      ["Gym", "Metric"],
      ['North, "Main"\nClub', "Active members"],
    ]),
    '"Gym","Metric"\r\n"North, ""Main""\nClub","Active members"',
  );
});

test("neutralizes formula-like untrusted text while preserving numeric values", () => {
  assert.equal(
    serializeCsv([
      ["=cmd", "+formula", "-formula", "@formula", "\t=cmd", -12.5, null],
    ]),
    `"\'=cmd","'+formula","'-formula","'@formula","'\t=cmd","-12.5",""`,
  );
});

test("serializes an empty report as an empty CSV", () => {
  assert.equal(serializeCsv([]), "");
});
