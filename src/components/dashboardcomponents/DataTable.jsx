import React, { useState, useEffect, useCallback, useMemo } from "react";
import { formatPossibleDate } from "../utils/DateNormalizer";
import { BiSolidRightArrow } from "react-icons/bi";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_ROWS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDisplayString = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "bigint") return val.toString();
    if (typeof val === "object")
        return JSON.stringify(val, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
    return String(formatPossibleDate(val) ?? "");
};

const isCompactColumn = (key, sampleValues) => {
    const k = key.toLowerCase();
    if (["id", "no", "num", "seq", "#", "rank", "pos", "row"].includes(k)) return true;
    if (k.endsWith("_id") || k.endsWith("_no") || k.endsWith("_num")) return true;
    return sampleValues.every((v) => {
        const s = toDisplayString(v);
        return s === "" || (/^\d+$/.test(s) && s.length <= 7);
    });
};

const inferMinWidth = (key, sampleValues) => {
    if (isCompactColumn(key, sampleValues)) return null;
    const k = key.toLowerCase();
    const maxLen = Math.max(0, ...sampleValues.map((v) => toDisplayString(v).length));
    if (["status", "count", "qty", "pct"].some((s) => k === s || k.endsWith(`_${s}`))) return 90;
    if (["name", "type", "channel", "label", "code", "tag", "group"].some((s) => k === s || k.endsWith(`_${s}`))) return 140;
    if (maxLen > 300) return 280;
    if (maxLen > 100) return 200;
    if (maxLen > 40) return 160;
    if (maxLen > 15) return 120;
    return 90;
};

// Map inferred min-width px values → Tailwind classes (avoids inline style)
const MIN_WIDTH_CLASS = {
    null: "min-w-[50px] max-w-auto",
    90: "min-w-[90px]",
    120: "min-w-[120px]",
    140: "min-w-[140px]",
    160: "min-w-[160px]",
    200: "min-w-[200px]",
    280: "min-w-[280px]",
};

// ─── JSON Syntax Highlighter ──────────────────────────────────────────────────

const highlightJson = (json) => {
    const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escaped.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let color = "#b5cea8";
            if (/^"/.test(match)) color = /:$/.test(match) ? "#9cdcfe" : "#ce9178";
            else if (/true|false|null/.test(match)) color = "#569cd6";
            return `<span style="color:${color}">${match}</span>`;
        }
    );
};

// ─── ExpandedJsonRow ─────────────────────────────────────────────────────────

const ExpandedJsonRow = ({ row, colSpan }) => {
    const jsonStr = JSON.stringify(row, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
    return (
        <tr className="bg-slate-950">
            {/*
        max-w-0 + w-full: the td does NOT contribute to table column widths,
        so a wide <pre> inside cannot stretch the table layout.
        The overflow-hidden on the td clips anything that would escape.
      */}
            <td colSpan={colSpan} className="p-0 max-w-0 w-full overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-y border-slate-700">
                    <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Row JSON
                    </span>
                    <div className="flex-1 h-px bg-slate-700" />
                    <span className="text-[10px] text-slate-500">{jsonStr.length} chars</span>
                </div>
                {/*
          whitespace-pre-wrap: preserves JSON indentation but wraps long lines.
          break-all: breaks within tokens (URLs, SQL, long strings) so nothing overflows.
          overflow-x-auto kept as safety net for genuinely unbreakable tokens.
        */}
                <pre
                    className="m-0 px-5 py-3.5 font-mono text-xs leading-relaxed text-slate-200 bg-slate-950 overflow-x-auto overflow-y-hidden whitespace-pre-wrap break-all"
                    dangerouslySetInnerHTML={{ __html: highlightJson(jsonStr) }}
                    aria-label="Row data in JSON format"
                />
            </td>
        </tr>
    );
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pagesPerGroup = 10;
    const currentGroup = Math.ceil(currentPage / pagesPerGroup);
    const startPage = (currentGroup - 1) * pagesPerGroup + 1;
    const endPage = Math.min(startPage + pagesPerGroup - 1, totalPages);
    const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    const btn = (active) =>
        `px-2.5 py-1 rounded text-xs font-medium border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${active
            ? "bg-emerald-600 border-emerald-600 text-white"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        }`;

    return (
        <nav
            className="flex justify-center mt-4 gap-1 flex-wrap select-none"
            aria-label="Table pagination"
        >
            <button className={btn(false)} onClick={() => onPageChange((p) => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page">‹ Prev</button>
            <button className={btn(false)} onClick={() => onPageChange(Math.max(1, startPage - 1))} disabled={startPage === 1} aria-label="Previous page group">«</button>
            {visiblePages.map((n) => (
                <button key={n} className={btn(currentPage === n)} onClick={() => onPageChange(n)} aria-label={`Page ${n}`} aria-current={currentPage === n ? "page" : undefined}>{n}</button>
            ))}
            <button className={btn(false)} onClick={() => onPageChange(Math.min(totalPages, endPage + 1))} disabled={endPage === totalPages} aria-label="Next page group">»</button>
            <button className={btn(false)} onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Next page">Next ›</button>
        </nav>
    );
};

// ─── DataTable ────────────────────────────────────────────────────────────────

/**
 * Unified, production-grade data table.
 *
 * Props:
 *   title         – string shown in the card header
 *   data          – array of row objects
 *   loading       – boolean
 *   error         – error string
 *   emptyText     – string shown when data is empty
 *   defaultRows   – initial rows-per-page (default 20)
 *   sidebarLabel  – sidebar heading (default "Fields")
 *   headerSlot    – ReactNode rendered below the header bar
 *   headerActions – ReactNode rendered in the top-right of the card header
 *   onClear       – if provided, a Clear button is shown in the header
 */
const DataTable = ({
    title = "Results",
    data = [],
    loading = false,
    error = "",
    emptyText = "No results",
    defaultRows = 20,
    sidebarLabel = "Fields",
    headerSlot,
    headerActions,
    onClear,
}) => {
    const [jsonOpenRows, setJsonOpenRows] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRows);

    useEffect(() => {
        setCurrentPage(1);
        setJsonOpenRows({});
    }, [data]);

    const columns = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);

    const colWidths = useMemo(
        () =>
            columns.reduce((acc, col) => {
                acc[col] = inferMinWidth(col, data.slice(0, SAMPLE_ROWS).map((r) => r[col]));
                return acc;
            }, {}),
        [columns, data]
    );

    const totalPages = Math.ceil(data.length / rowsPerPage);
    const paginatedData = useMemo(
        () => data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage),
        [data, currentPage, rowsPerPage]
    );

    const toggleJsonRow = useCallback(
        (i, e) => { e.stopPropagation(); setJsonOpenRows((p) => ({ ...p, [i]: !p[i] })); },
        []
    );

    return (
        <div className="mx-2 rounded-xl shadow-md border border-slate-200 overflow-hidden font-sans">

            {/* ── Card Header ── */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-gray-700">
                <span className="text-base font-bold text-slate-100 tracking-tight">{title}</span>
                <div className="flex items-center gap-2">
                    {headerActions}
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="px-3 py-1 rounded font-medium text-red-300 border border-red-400/30 bg-red-500/10 hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
                            aria-label="Clear results"
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>
            </div>

            {/* ── Optional header slot ── */}
            {headerSlot && (
                <div className="bg-white border-b border-slate-200 px-4 py-3">
                    {headerSlot}
                </div>
            )}

            {/* ── Body ── */}
            <div className="flex flex-row">

                {/* Sidebar */}
                {sidebarOpen && columns.length > 0 && (
                    <aside className="w-48 shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto p-3" aria-label="Column fields">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 pb-2 border-b border-slate-200">
                            <span>{sidebarLabel}</span>
                            <button
                                className="text-slate-400 hover:text-slate-600 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                                onClick={() => setSidebarOpen(false)}
                                aria-label="Hide fields sidebar"
                            >
                                Hide ✕
                            </button>
                        </div>
                        <ul className="list-none m-0 p-0">
                            {columns.map((key) => (
                                <li key={key} className="flex items-center gap-1.5 px-1.5 py-1 rounded mb-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                                    <span className="text-[12.5px] font-mono text-slate-700 break-all leading-snug">{key}</span>
                                </li>
                            ))}
                        </ul>
                    </aside>
                )}

                {/* Main */}
                <main className="flex-1 bg-white p-3.5 overflow-hidden min-w-0">

                    {!sidebarOpen && columns.length > 0 && (
                        <button
                            className="text-xs mb-3 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-medium hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Show fields sidebar"
                        >
                            ☰ Show Fields
                        </button>
                    )}

                    {/* States */}
                    {loading ? (
                        <p className="text-center py-12 text-slate-400 text-sm" role="status" aria-live="polite">Loading data…</p>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-2" role="alert">
                            <pre className="text-red-600 text-xs whitespace-pre-wrap break-all m-0">{error}</pre>
                        </div>
                    ) : data.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">{emptyText}</p>
                    ) : (
                        <>
                            {/* Meta bar */}
                            <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-800">
                                    {data.length.toLocaleString()} row{data.length !== 1 ? "s" : ""}
                                    {totalPages > 1 && (
                                        <span className="text-xs text-slate-400 font-normal ml-1.5">— page {currentPage} of {totalPages}</span>
                                    )}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <label htmlFor="rows-per-page">Rows/page:</label>
                                    <select
                                        id="rows-per-page"
                                        value={rowsPerPage}
                                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="border border-slate-200 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    >
                                        {/* Number of rows selection */}
                                        {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto overflow-y-auto max-h-135 border border-slate-200 rounded-lg">
                                <table className="w-full border-collapse text-[13px]" aria-label={title}>
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-800 border-b-2 border-slate-700">
                                            <th
                                                className="w-12 px-2 py-2.5 text-center border-r border-slate-200 text-slate-400 font-bold text-[11px] bg-slate-800 whitespace-nowrap select-none"
                                                title="Click row number to view raw JSON"
                                                scope="col"
                                                aria-label="Row actions"
                                            />
                                            {columns.map((key) => (
                                                <th
                                                    key={key}
                                                    scope="col"
                                                    title={key}
                                                    className={`px-3.5 py-2.5 text-left font-bold text-xs text-slate-200 border-r border-slate-200 bg-slate-800 whitespace-nowrap tracking-wide ${MIN_WIDTH_CLASS[colWidths[key]] ?? "min-w-22.5"}`}
                                                >
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((row, i) => {
                                            const absoluteIndex = (currentPage - 1) * rowsPerPage + i + 1;
                                            const isJsonOpen = !!jsonOpenRows[i];

                                            return (
                                                <React.Fragment key={i}>
                                                    <tr
                                                        className={`cursor-pointer transition-colors duration-100 hover:bg-sky-50 ${i % 2 === 0 ? "bg-white" : "bg-neutral-200"}`}
                                                        onClick={(e) => toggleJsonRow(i, e)}
                                                        aria-expanded={isJsonOpen}
                                                        aria-label={`Row ${absoluteIndex}, click to ${isJsonOpen ? "collapse" : "expand"} JSON`}
                                                    >
                                                        {/* # cell */}
                                                        <td
                                                            className="min-w-12 border-r border-slate-300 text-center align-middle px-1 py-0 select-none cursor-pointer"
                                                            aria-label={`View JSON for row ${absoluteIndex}`}
                                                        >
                                                            <div className="flex flex-col items-center gap-0.5 py-1.5">
                                                                <span
                                                                    className={`text-[13px] font-bold leading-none transition-all duration-150 ${isJsonOpen ? "text-emerald-500 rotate-90" : "text-slate-400"}`}
                                                                    aria-hidden="true"
                                                                >
                                                                    <BiSolidRightArrow />
                                                                </span>
                                                                <span className="text-[10.5px] text-slate-400 font-mono leading-none">{absoluteIndex}</span>
                                                            </div>
                                                        </td>

                                                        {/* Data cells */}
                                                        {columns.map((col, j) => {
                                                            const val = row[col];
                                                            const str = toDisplayString(val);
                                                            const isNull = val === null || val === undefined || str === "";
                                                            return (
                                                                <td
                                                                    key={j}
                                                                    className={`px-3.5 py-2.5 break-all border-r border-slate-300 align-top ${MIN_WIDTH_CLASS[colWidths[col]] ?? "min-w-22.5"}`}
                                                                >
                                                                    {isNull ? (
                                                                        <span className="text-xs text-slate-400 italic">—</span>
                                                                    ) : (
                                                                        <span className="text-[13px] text-slate-800 leading-relaxed break-all">
                                                                            {str}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>

                                                    {/* JSON panel */}
                                                    {isJsonOpen && <ExpandedJsonRow row={row} colSpan={columns.length + 1} />}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default DataTable;