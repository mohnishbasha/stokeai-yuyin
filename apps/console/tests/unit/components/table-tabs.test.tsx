// @vitest-environment jsdom
// CN-48 unit_console_components_keyboardnav_focusringvisible (Tabs, Table)
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table, type Column } from "../../../src/components/ui/Table";
import { Tabs } from "../../../src/components/ui/Tabs";

afterEach(cleanup);

const TABS = [
  { id: "a", label: "One", panel: <p>Panel one</p> },
  { id: "b", label: "Two", panel: <p>Panel two</p> },
  { id: "c", label: "Three", panel: <p>Panel three</p> },
];

describe("Tabs", () => {
  it("test_tabs_render_selectedisthesingletabstop", () => {
    render(<Tabs label="Language" tabs={TABS} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel one");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tabs[0]?.id);
  });

  it("test_tabs_arrowsandhomeend_moveandactivateautomatically", () => {
    const onChange = vi.fn();
    render(<Tabs label="Language" tabs={TABS} onChange={onChange} />);
    const first = screen.getByRole("tab", { name: "One" });
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Two" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Two" }));
    fireEvent.keyDown(document.activeElement as Element, { key: "End" });
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel three");
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "One" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Three" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement as Element, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("a");
  });

  it("test_tabs_manualactivation_needsenterorspace", () => {
    render(<Tabs label="Range" tabs={TABS} activation="manual" />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "One" }), { key: "ArrowRight" });
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel one");
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel two");
  });

  it("test_tabs_click_selects", () => {
    render(<Tabs label="Range" tabs={TABS} />);
    fireEvent.click(screen.getByRole("tab", { name: "Three" }));
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel three");
  });

  it("test_tabs_controlled_followsselectedprop", () => {
    const { rerender } = render(<Tabs label="Range" tabs={TABS} selected="b" onChange={() => undefined} />);
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel two");
    rerender(<Tabs label="Range" tabs={TABS} selected="c" onChange={() => undefined} />);
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel three");
  });

  it("test_tabs_disabledtab_isskippedbyarrows", () => {
    const tabs = [TABS[0], { ...TABS[1], disabled: true }, TABS[2]] as typeof TABS;
    render(<Tabs label="Range" tabs={tabs} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "One" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Three" }).getAttribute("aria-selected")).toBe("true");
  });
});

interface Row {
  id: string;
  name: string;
  chars: number;
}
const COLUMNS: Column<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "chars", header: "Characters", numeric: true, sortable: true },
];
const ROWS: Row[] = [
  { id: "1", name: "Beta", chars: 20 },
  { id: "2", name: "Alpha", chars: 100 },
];

describe("Table", () => {
  it("test_table_render_hascaptionheadersandrows", () => {
    render(<Table caption="API keys" columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);
    expect(screen.getByRole("table", { name: "API keys" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("2 rows")).toBeTruthy();
  });

  it("test_table_sortbutton_togglesariasortandorders", () => {
    render(<Table caption="Keys" columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(screen.getAllByRole("row")[1]?.textContent).toContain("Alpha");
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(header.getAttribute("aria-sort")).toBe("descending");
    expect(screen.getAllByRole("row")[1]?.textContent).toContain("Beta");
  });

  it("test_table_numericsort_ordersbynumber", () => {
    render(<Table caption="Keys" columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);
    fireEvent.click(screen.getByRole("button", { name: /Characters/ }));
    expect(screen.getAllByRole("row")[1]?.textContent).toContain("Beta");
  });

  it("test_table_loading_showsbusyskeletonrows", () => {
    render(<Table caption="Keys" columns={COLUMNS} rows={[]} rowKey={(r) => r.id} loading />);
    expect(screen.getByRole("table").getAttribute("aria-busy")).toBe("true");
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("test_table_error_rendersgivenerrorstateinsteadofrows", () => {
    render(
      <Table caption="Keys" columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} error={<p>Boom</p>} />,
    );
    expect(screen.getByText("Boom")).toBeTruthy();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("test_table_pagination_isanavlandmarkwithbuttons", () => {
    const onPageChange = vi.fn();
    render(
      <Table
        caption="Keys"
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        page={2}
        pageCount={3}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });
});
