import { describe, expect, test } from "bun:test";
import { MetricType } from "@lanterna/core";
import { parseTopMemory } from "../parsers/memory";
import { parseXctraceXml } from "../parsers/xctrace-xml";

describe("parseXctraceXml", () => {
	const sampleXml = `<?xml version="1.0"?>
<trace-toc>
  <run number="1">
    <data>
      <table schema="time-profile">
        <row>
          <sample-time id="1" fmt="00:00.001.000">1000000</sample-time>
          <thread id="2" fmt="main (12345)">
            <tid fmt="12345">12345</tid>
          </thread>
          <process id="3" fmt="MyApp (12345)">
            <pid fmt="12345">12345</pid>
          </process>
          <weight id="5" fmt="1.00 ms">1000000</weight>
        </row>
        <row>
          <sample-time id="6" fmt="00:00.002.000">2000000</sample-time>
          <thread id="7" fmt="mqt_js (12350)">
            <tid fmt="12350">12350</tid>
          </thread>
          <process ref="3"/>
          <weight id="9" fmt="2.50 ms">2500000</weight>
        </row>
      </table>
    </data>
  </run>
</trace-toc>`;

	test("parses weight values and computes CPU percentage", () => {
		// Total weight: 1000000 + 2500000 = 3500000 ns
		// Duration: 5 seconds = 5e9 ns
		// CPU%: (3500000 / 5e9) * 100 = 0.07%
		const samples = parseXctraceXml(sampleXml, 5);

		expect(samples).toHaveLength(1);
		expect(samples[0].type).toBe(MetricType.CPU);
		expect(samples[0].value).toBe(0.07);
		expect(samples[0].unit).toBe("%");
	});

	test("handles single row XML", () => {
		const xml = `<trace-toc>
  <run number="1">
    <data>
      <table schema="time-profile">
        <row>
          <weight id="1" fmt="500.00 ms">500000000</weight>
        </row>
      </table>
    </data>
  </run>
</trace-toc>`;

		// 500000000 ns / (10 * 1e9) * 100 = 5%
		const samples = parseXctraceXml(xml, 10);

		expect(samples).toHaveLength(1);
		expect(samples[0].type).toBe(MetricType.CPU);
		expect(samples[0].value).toBe(5);
		expect(samples[0].unit).toBe("%");
	});

	test("returns empty array for empty input", () => {
		expect(parseXctraceXml("", 5)).toEqual([]);
	});

	test("returns empty array for zero duration", () => {
		expect(parseXctraceXml(sampleXml, 0)).toEqual([]);
	});

	test("returns empty array for negative duration", () => {
		expect(parseXctraceXml(sampleXml, -1)).toEqual([]);
	});

	test("returns empty array for XML with no weight elements", () => {
		const xml = `<?xml version="1.0"?>
<trace-toc>
  <run number="1">
    <data>
      <table schema="time-profile">
        <row>
          <sample-time id="1" fmt="00:00.001.000">1000000</sample-time>
        </row>
      </table>
    </data>
  </run>
</trace-toc>`;

		expect(parseXctraceXml(xml, 5)).toEqual([]);
	});

	test("returns empty array for malformed XML", () => {
		expect(parseXctraceXml("not xml at all", 5)).toEqual([]);
	});

	test("handles large weight values", () => {
		const xml = `<trace-toc>
  <run number="1">
    <data>
      <table schema="time-profile">
        <row>
          <weight id="1" fmt="2.00 s">2000000000</weight>
        </row>
        <row>
          <weight id="2" fmt="3.00 s">3000000000</weight>
        </row>
      </table>
    </data>
  </run>
</trace-toc>`;

		// Total: 5e9 ns / (10 * 1e9) * 100 = 50%
		const samples = parseXctraceXml(xml, 10);

		expect(samples).toHaveLength(1);
		expect(samples[0].value).toBe(50);
	});
});

describe("parseTopMemory", () => {
	const timestamp = 1700000000000;

	test("parses memory with M suffix", () => {
		const output = `PID    RSIZE
12345  250M`;

		const samples = parseTopMemory(output, timestamp);

		expect(samples).toHaveLength(1);
		expect(samples[0].type).toBe(MetricType.MEMORY);
		expect(samples[0].value).toBe(250);
		expect(samples[0].unit).toBe("MB");
		expect(samples[0].timestamp).toBe(timestamp);
	});

	test("parses memory with G suffix", () => {
		const output = `PID    RSIZE
12345  2G`;

		const samples = parseTopMemory(output, timestamp);

		expect(samples).toHaveLength(1);
		expect(samples[0].type).toBe(MetricType.MEMORY);
		expect(samples[0].value).toBe(2048);
		expect(samples[0].unit).toBe("MB");
	});

	test("parses memory with trailing + sign", () => {
		const output = `PID    RSIZE
12345  250M+`;

		const samples = parseTopMemory(output, timestamp);

		expect(samples).toHaveLength(1);
		expect(samples[0].value).toBe(250);
	});

	test("parses memory with trailing - sign", () => {
		const output = `PID    RSIZE
12345  180M-`;

		const samples = parseTopMemory(output, timestamp);

		expect(samples).toHaveLength(1);
		expect(samples[0].value).toBe(180);
	});

	test("parses memory with decimal value", () => {
		const output = `PID    RSIZE
12345  1.5G+`;

		const samples = parseTopMemory(output, timestamp);

		expect(samples).toHaveLength(1);
		expect(samples[0].value).toBe(1536);
	});

	test("returns empty array for empty input", () => {
		expect(parseTopMemory("", timestamp)).toEqual([]);
	});

	test("returns empty array for header-only output", () => {
		const output = "PID    RSIZE\n";
		expect(parseTopMemory(output, timestamp)).toEqual([]);
	});

	test("returns empty array for malformed output", () => {
		expect(parseTopMemory("random garbage text", timestamp)).toEqual([]);
	});

	test("returns empty array for output with unrecognized suffix", () => {
		const output = `PID    RSIZE
12345  250K`;

		expect(parseTopMemory(output, timestamp)).toEqual([]);
	});
});
