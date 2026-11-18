// The single entry point the console pages use to read data. Today it returns the mock layer;
// when the real layer exists, this is the only file that changes.
import { parseScreenState, type ScreenId, type ScreenState } from "../screens";
import { createMockData } from "./mock";
import { DataError, type ConsoleData, type ScreenResult } from "./types";

/** The Next.js `searchParams` prop of a page (a promise in the App Router). */
export interface ScreenPageProps {
  readonly searchParams: Promise<Readonly<Record<string, string | readonly string[] | undefined>>>;
}

export function getConsoleData(state: ScreenState, screen: ScreenId): ConsoleData {
  return createMockData(state, screen);
}

/** Runs one read, mapping the `loading` flag and a `DataError` to serialisable results. */
export async function loadScreen<T>(
  state: ScreenState,
  data: ConsoleData,
  read: (data: ConsoleData) => Promise<T>,
): Promise<ScreenResult<T>> {
  if (state === "loading") return { status: "loading" };
  try {
    return { status: "ok", data: await read(data) };
  } catch (error) {
    if (error instanceof DataError) {
      return { status: "error", code: error.code, traceId: error.traceId };
    }
    throw error;
  }
}

/** The state flag and the data layer for a page, in one call. */
export async function openScreen(
  props: ScreenPageProps,
  screen: ScreenId,
): Promise<{ readonly state: ScreenState; readonly data: ConsoleData }> {
  const params = await props.searchParams;
  const state = parseScreenState(params.state, screen);
  return { state, data: getConsoleData(state, screen) };
}
