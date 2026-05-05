import React, { useState } from "react";
import DataTable from "../DataTable";
import DisplayCharts from "../../DisplayCharts";
import PerformantTable from "./PerformantTable";

// ─── Constants ────────────────────────────────────────────────────────────────

const DISPLAY_OPTIONS = [
    { value: "table", label: "Table", icon: "📊" },
    { value: "line", label: "Line Chart", icon: "📈" },
    { value: "bar", label: "Bar Chart", icon: "📊" },
    { value: "pie", label: "Pie Chart", icon: "🥧" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a param description value that may be a string, object, or null. */
const resolveDesc = (value) => {
    if (!value) return "";
    if (typeof value === "object") return value.value || value.description || JSON.stringify(value);
    return value;
};

/** Validate a single parameter value against its description hints. */
const validateParam = (key, value, paramDesc) => {
    if (!value || value.trim() === "") return null; // empty → use server default
    if (value.length > 10_000) return ["Input too long (max 10 000 characters)"];

    const desc = resolveDesc(paramDesc).toLowerCase();
    const errors = [];
    if ((desc.includes("number") || desc.includes("integer")) && isNaN(Number(value)))
        errors.push("Must be a valid number");
    if (desc.includes("date") && isNaN(Date.parse(value)))
        errors.push("Must be a valid date");
    return errors.length ? errors : null;
};

// ─── DisplayTypeSelect ────────────────────────────────────────────────────────

/** Reusable display-type <select> used in QueryResultDisplay. */
const DisplayTypeSelect = ({ value, onChange }) => (
    <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300">Display:</span>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs border border-gray-500 rounded px-2 py-1 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {DISPLAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
            ))}
        </select>
    </div>
);

// ─── ParameterDialog ─────────────────────────────────────────────────────────

export const ParameterDialog = ({ query, onClose, onExecute }) => {
    const [params, setParams] = useState({});
    const [errors, setErrors] = useState({});
    const paramEntries = Object.entries(query.parameterDescriptions || {});

    const handleExecute = () => {
        const validationErrors = {};
        let valid = true;

        paramEntries.forEach(([key]) => {
            const err = validateParam(key, params[key], query.parameterDescriptions[key]);
            if (err) { validationErrors[key] = err; valid = false; }
        });

        if (!valid) { setErrors(validationErrors); return; }

        setErrors({});
        onExecute(query.name, params, query);
        onClose();
    };

    const handleChange = (key, value) => {
        setParams((p) => ({ ...p, [key]: value }));
        if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-gray-800">Execute: {query.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                {query.description && (
                    <p className="text-gray-500 text-sm mb-4">{query.description}</p>
                )}

                {paramEntries.length > 0 ? (
                    <div className="space-y-3 mb-4">
                        <h4 className="font-semibold text-gray-700 text-sm">Parameters</h4>
                        {paramEntries.map(([key, value]) => {
                            const desc = resolveDesc(value);
                            const hasError = !!errors[key]?.length;
                            return (
                                <div key={key}>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">{key}</label>
                                    {desc && <p className="text-xs text-gray-400 mb-1">{desc}</p>}
                                    <input
                                        type="text"
                                        value={params[key] || ""}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        placeholder={`Enter ${key}`}
                                        className={`w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 ${hasError ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-green-500"
                                            }`}
                                    />
                                    {hasError && (
                                        <p className="text-xs text-red-600 mt-1">{errors[key].join(", ")}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm mb-4">No parameters required.</p>
                )}

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
                        Cancel
                    </button>
                    <button onClick={handleExecute} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold">
                        Execute
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── GroupsView ───────────────────────────────────────────────────────────────

export const GroupsView = ({ groups, loading, error, onSelectGroup, onExecuteAll }) => {
    const columns = [
        {
            key: "index",
            label: "#",
            width: "w-8",
            render: (_, i) => <span className="text-gray-400 text-xs text-center block">{i + 1}</span>,
        },
        {
            key: "query_group",
            label: "Group",
            render: (g) => <span className="font-semibold text-gray-800 text-sm">{g.query_group}</span>,
        },
        {
            key: "query_count",
            label: "Queries",
            render: (g) => (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                    {g.ids?.length ?? 0} queries
                </span>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (g) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => onSelectGroup(g.query_group)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                    >
                        Open
                    </button>
                    <button
                        onClick={() => onExecuteAll(g.query_group)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
                    >
                        Execute All
                    </button>
                </div>
            ),
        },
    ];

    return (
        <PerformantTable
            columns={columns}
            data={groups}
            loading={loading}
            error={error}
            emptyText="No groups available."
            rowKey={(g) => g.query_group}
            defaultRowsPerPage={10}
            title="Query Groups"
        />
    );
};

// ─── QueriesView ──────────────────────────────────────────────────────────────

export const QueriesView = ({ queries, loading, error, filterQuery, onBack, onExecute, onExecuteAll, isExecutingAll }) => {
    const filtered = filterQuery
        ? queries.filter((q) => {
            const term = filterQuery.toLowerCase();
            return (
                q.name?.toLowerCase().includes(term) ||
                q.description?.toLowerCase().includes(term) ||
                Object.entries(q.parameterDescriptions || {}).some(
                    ([k, v]) => k?.toLowerCase().includes(term) || String(v)?.toLowerCase().includes(term)
                )
            );
        })
        : queries;

    const columns = [
        {
            key: "index",
            label: "#",
            width: "w-8",
            render: (_, i) => <span className="text-gray-400 text-xs text-center block">{i + 1}</span>,
        },
        {
            key: "name",
            label: "Name",
            render: (q) => <span className="font-semibold text-gray-800 text-sm">{q.name}</span>,
        },
        {
            key: "description",
            label: "Description",
            cellClassName: "text-gray-600 text-xs max-w-xs",
            render: (q) => q.description || <span className="text-gray-300">—</span>,
        },
        {
            key: "params",
            label: "Params",
            render: (q) => (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                    {Object.keys(q.parameterDescriptions || {}).length} param(s)
                </span>
            ),
        },
        {
            key: "action",
            label: "Action",
            render: (q) => (
                <button
                    onClick={() => onExecute(q)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                >
                    Execute
                </button>
            ),
        },
    ];

    return (
        <div>
            <div className="flex items-center gap-3 mb-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-semibold"
                >
                    ← Back
                </button>
                <p className="text-sm text-gray-500">
                    {filtered.length} quer{filtered.length === 1 ? "y" : "ies"}
                </p>
                <button
                    onClick={onExecuteAll}
                    disabled={isExecutingAll}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${isExecutingAll ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                >
                    {isExecutingAll ? "Executing..." : "Execute All Queries"}
                </button>
            </div>

            {filtered.length > 0 && (
                <PerformantTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    error={error}
                    emptyText="No queries in this group."
                    rowKey={(q) => q.name}
                    defaultRowsPerPage={20}
                    title={`Queries: ${filtered.length} total`}
                />
            )}

            {!loading && !error && queries.length > 0 && filtered.length === 0 && (
                <p className="text-center py-8 text-gray-400 text-sm">No queries match your search.</p>
            )}
        </div>
    );
};

// ─── QueryResultDisplay ───────────────────────────────────────────────────────

/**
 * Renders query results as a table or chart based on preferredDisplay,
 * with a live display-type override selector in the header.
 *
 * Supports: table | line | bar | pie
 */
export const QueryResultDisplay = ({ queryName, data, preferredDisplay = "table", currentDisplay, onDisplayChange }) => {
    const displayType = (currentDisplay || preferredDisplay).toLowerCase();
    const isChart = ["line", "bar", "pie"].includes(displayType);

    if (!isChart) {
        return (
            <DataTable
                title={queryName}
                data={data || []}
                emptyText="Query returned no rows."
                headerActions={onDisplayChange && (
                    <DisplayTypeSelect value={displayType} onChange={onDisplayChange} />
                )}
            />
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                <h3 className="text-base font-semibold text-white">{queryName}</h3>
                {onDisplayChange && <DisplayTypeSelect value={displayType} onChange={onDisplayChange} />}
            </div>
            <div className="p-4">
                <DisplayCharts data={data || []} view={displayType} width={1000} height={400} />
            </div>
        </div>
    );
};

// ─── BulkResultsSummary ───────────────────────────────────────────────────────

/** Summary card + per-query results + failed-queries table for bulk execution. */
export const BulkResultsSummary = ({ bulkResultsData, displayOverrides, onDisplayChange, onClear }) => {
    const { results, errors, total } = bulkResultsData;

    const statCard = (label, count, colorCls) => (
        <div className={`border rounded-lg p-4 flex-1 text-center ${colorCls}`}>
            <p className="text-xs font-semibold mb-1">{label}</p>
            <p className="text-2xl font-bold">{count}</p>
        </div>
    );

    return (
        <div className="mt-15 space-y-6">
            {/* Summary header */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                    <h3 className="text-base font-semibold text-white">Bulk Execution Results</h3>
                    <button
                        onClick={onClear}
                        className="px-3 py-1 rounded font-medium text-red-300 border border-red-400/30 bg-red-500/10 hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
                        aria-label="Clear results"
                    >
                        ✕ Clear
                    </button>
                </div>
                <div className="p-4 flex gap-4">
                    {statCard("Successful", results.length, "bg-green-50 border-green-200 text-green-700")}
                    {statCard("Failed", errors.length, "bg-red-50 border-red-200 text-red-700")}
                    {statCard("Total", total, "bg-blue-50 border-blue-200 text-blue-700")}
                </div>
            </div>

            {/* Per-query results */}
            {results.map((result, i) => (
                <div key={result.queryName || i} className="mt-15">
                    <QueryResultDisplay
                        queryName={result.queryName}
                        data={result.data || []}
                        preferredDisplay={result.preferredDisplay || "table"}
                        currentDisplay={displayOverrides[result.queryName]}
                        onDisplayChange={(type) => onDisplayChange(result.queryName, type)}
                    />
                </div>
            ))}

            {/* Failed queries table */}
            {errors.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                    <div className="bg-red-700 px-4 py-3">
                        <h4 className="text-sm font-semibold text-white">Failed Queries ({errors.length})</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left font-semibold border-r w-8">#</th>
                                    <th className="p-2 text-left font-semibold border-r">Query Name</th>
                                    <th className="p-2 text-left font-semibold">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {errors.map((err, i) => (
                                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                        <td className="p-2 border-r text-gray-400 text-center">{i + 1}</td>
                                        <td className="p-2 border-r font-medium text-gray-800">{err.queryName}</td>
                                        <td className="p-2 text-red-600 font-mono text-[11px] break-all">{err.error}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};