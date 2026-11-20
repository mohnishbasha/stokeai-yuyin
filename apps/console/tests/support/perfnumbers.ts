// Finds latency, throughput, and capacity figures in text (SOUL: never publish a number you
// did not measure). Prices, code point limits, and dates are not performance figures.
export interface PerfFinding {
  readonly kind: string;
  readonly text: string;
}

const RULES: readonly { kind: string; pattern: RegExp }[] = [
  {
    kind: "duration",
    pattern: /\d[\d,.]*\s*(?:ms|msec|milliseconds?|seconds?|secs?|s|µs|us)(?![\w-])/gi,
  },
  { kind: "percentile", pattern: /\bp(?:50|90|95|99|99\.9)\b/gi },
  { kind: "rtf", pattern: /\b(?:rtf|real-time factor|realtime factor)\b[^.]{0,20}\d/gi },
  { kind: "speed-multiple", pattern: /\d[\d,.]*\s*[x×]\s*(?:real-?time|faster)/gi },
  {
    kind: "capacity",
    pattern:
      /\d[\d,.]*\s*(?:\+\s*)?(?:concurrent|simultaneous|parallel|streams?|connections?|sessions?|qps|rps|requests?\s+per|characters?\s+per\s+second)/gi,
  },
  {
    kind: "capacity",
    pattern: /(?:concurrent|simultaneous)\s+(?:streams?|connections?|sessions?)[^.]{0,20}\d/gi,
  },
  { kind: "uptime", pattern: /\d+(?:\.\d+)?\s*%\s*(?:uptime|availability)/gi },
];

export function findPerformanceNumbers(text: string): PerfFinding[] {
  return RULES.flatMap(({ kind, pattern }) =>
    [...text.matchAll(pattern)].map((match) => ({ kind, text: match[0] })),
  );
}
