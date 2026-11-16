// Request samples for the CodeBlock and KeyReveal. Every sample reads the key from the
// YUYIN_API_KEY environment variable and never contains a real key (DESIGN 5.11).

export type SnippetId = "curl" | "typescript" | "python";

export interface Snippet {
  readonly id: string;
  readonly label: string;
  readonly code: string;
}

const DEFAULT_BASE_URL = "https://api.yuyin.openstoke.com";

export function buildSpeechSnippets(baseUrl: string = DEFAULT_BASE_URL): Snippet[] {
  const url = `${baseUrl}/v1/speech`;
  const curl = [
    `curl ${url} \\`,
    `  -H "Authorization: Bearer $YUYIN_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"text": "आपका ओटीपी 4 8 2 9 1 6 है।", "voice": "asha", "format": "wav"}' \\`,
    `  --output speech.wav`,
  ].join("\n");
  const typescript = [
    `const response = await fetch("${url}", {`,
    `  method: "POST",`,
    `  headers: {`,
    "    Authorization: `Bearer ${process.env.YUYIN_API_KEY}`,",
    `    "Content-Type": "application/json",`,
    `  },`,
    `  body: JSON.stringify({ text: "Your OTP is 4 8 2 9 1 6.", voice: "asha", format: "wav" }),`,
    `});`,
    `const audio = Buffer.from(await response.arrayBuffer());`,
  ].join("\n");
  const python = [
    `import os`,
    `import requests`,
    ``,
    `response = requests.post(`,
    `    "${url}",`,
    `    headers={"Authorization": f"Bearer {os.environ['YUYIN_API_KEY']}"},`,
    `    json={"text": "Your OTP is 4 8 2 9 1 6.", "voice": "asha", "format": "wav"},`,
    `    timeout=30,`,
    `)`,
    `audio = response.content`,
  ].join("\n");
  return [
    { id: "curl", label: "curl", code: curl },
    { id: "typescript", label: "TypeScript", code: typescript },
    { id: "python", label: "Python", code: python },
  ];
}
