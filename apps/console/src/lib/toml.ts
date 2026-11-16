// A parser for the small TOML subset used by the files in config/: comments, `[table]`
// headers, and `key = value` lines whose value is an integer or a basic string. Anything else
// (floats, arrays, inline tables, duplicate keys) throws, so a config change that needs more
// than this subset fails loudly instead of being misread.

export type TomlValue = number | string | TomlTable;
export interface TomlTable {
  [key: string]: TomlValue;
}

const KEY = /^[A-Za-z0-9_-]+$/;
const INTEGER = /^[+-]?\d+(?:_\d+)*$/;

function stripComment(line: string): string {
  let inString = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\\" && inString) i += 1;
    else if (char === '"') inString = !inString;
    else if (char === "#" && !inString) return line.slice(0, i);
  }
  return line;
}

function parseValue(raw: string, lineNo: number): number | string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  if (INTEGER.test(raw)) {
    const value = Number(raw.replaceAll("_", ""));
    if (!Number.isSafeInteger(value))
      throw new RangeError(`line ${String(lineNo)}: integer out of range`);
    return value;
  }
  throw new SyntaxError(`line ${String(lineNo)}: unsupported value "${raw}"`);
}

export function parseToml(text: string): TomlTable {
  const root: TomlTable = {};
  let table = root;
  text.split(/\r?\n/).forEach((original, index) => {
    const lineNo = index + 1;
    const line = stripComment(original).trim();
    if (line === "") return;
    if (line.startsWith("[")) {
      if (!line.endsWith("]"))
        throw new SyntaxError(`line ${String(lineNo)}: unclosed table header`);
      const name = line.slice(1, -1).trim();
      if (!KEY.test(name)) throw new SyntaxError(`line ${String(lineNo)}: bad table name`);
      if (name in root) throw new SyntaxError(`line ${String(lineNo)}: duplicate table ${name}`);
      table = {};
      root[name] = table;
      return;
    }
    const equals = line.indexOf("=");
    if (equals < 0) throw new SyntaxError(`line ${String(lineNo)}: expected key = value`);
    const key = line.slice(0, equals).trim();
    const raw = line.slice(equals + 1).trim();
    if (!KEY.test(key)) throw new SyntaxError(`line ${String(lineNo)}: bad key`);
    if (raw === "") throw new SyntaxError(`line ${String(lineNo)}: missing value`);
    if (key in table) throw new SyntaxError(`line ${String(lineNo)}: duplicate key ${key}`);
    table[key] = parseValue(raw, lineNo);
  });
  return root;
}
