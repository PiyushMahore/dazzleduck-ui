import React, { useEffect, useState } from "react";
import { IoIosClose } from "react-icons/io";
import { IoReload } from "react-icons/io5";
import DataTable from "./DataTable";

// ─── Reusable sub-components ────────────────────────────────────────────────

const StatusMessage = ({ loading, error, empty, emptyText }) => {
    if (loading) return <p className="text-center py-8 text-gray-500 text-sm">Loading...</p>;
    if (error) return <pre className="text-red-600 text-center p-5 whitespace-pre-wrap text-sm">{error}</pre>;
    if (empty) return <p className="text-center py-8 text-gray-500 text-sm">{emptyText}</p>;
    return null;
};

const TableWrapper = ({ children }) => (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs sm:text-sm border-collapse">{children}</table>
    </div>
);

// ─── Parameter Dialog ────────────────────────────────────────────────────────

const ParameterDialog = ({ query, onClose, onExecute }) => {
    const [params, setParams] = useState({});
    const paramEntries = Object.entries(query.parameterDescriptions || {});

    const handleExecute = () => {
        onExecute(query.name, params);
        onClose();
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
                            const desc = typeof value === "object" && value !== null
                                ? (value.value || value.description || JSON.stringify(value))
                                : value;
                            return (
                                <div key={key}>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">{key}</label>
                                    {desc && <p className="text-xs text-gray-400 mb-1">{desc}</p>}
                                    <input
                                        type="text"
                                        value={params[key] || ""}
                                        onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                                        placeholder={`Enter ${key}`}
                                        className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm mb-4">No parameters required.</p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExecute}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
                    >
                        Execute
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Groups View ─────────────────────────────────────────────────────────────

const GroupsView = ({ groups, loading, error, onSelectGroup, onExecuteAll }) => (
    <div>
        <StatusMessage loading={loading} error={error} empty={!groups.length} emptyText="No groups available." />
        {groups.length > 0 && (
            <TableWrapper>
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        <th className="p-2 text-left text-xs font-semibold border-r w-8">#</th>
                        <th className="p-2 text-left text-xs font-semibold border-r">Group</th>
                        <th className="p-2 text-left text-xs font-semibold border-r">Queries</th>
                        <th className="p-2 text-left text-xs font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map((group, i) => (
                        <tr key={group.query_group} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="p-2 border-r text-gray-400 text-xs text-center">{i + 1}</td>
                            <td className="p-2 border-r font-semibold text-gray-800 text-sm">{group.query_group}</td>
                            <td className="p-2 border-r">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                                    {group.ids?.length ?? 0} queries
                                </span>
                            </td>
                            <td className="p-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onSelectGroup(group.query_group)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                                    >
                                        Open
                                    </button>
                                    <button
                                        onClick={() => onExecuteAll(group.query_group)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
                                    >
                                        Execute All
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </TableWrapper>
        )}
    </div>
);

// ─── Queries View ─────────────────────────────────────────────────────────────

const QueriesView = ({ queries, loading, error, onBack, onExecute, filterQuery, onExecuteAll, isExecutingAll }) => {
    const filtered = filterQuery
        ? queries.filter((q) => {
            const term = filterQuery.toLowerCase();
            return (
                q.name?.toLowerCase().includes(term) ||
                q.description?.toLowerCase().includes(term) ||
                Object.entries(q.parameterDescriptions || {}).some(
                    ([k, v]) =>
                        k?.toLowerCase().includes(term) ||
                        String(v)?.toLowerCase().includes(term)
                )
            );
        })
        : queries;

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
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${isExecutingAll
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                >
                    {isExecutingAll ? "Executing..." : "Execute All Queries"}
                </button>
            </div>

            <StatusMessage loading={loading} error={error} empty={!queries.length} emptyText="No queries in this group." />
            {!loading && !error && queries.length > 0 && filtered.length === 0 && (
                <p className="text-center py-8 text-gray-400 text-sm">No queries match your search.</p>
            )}

            {filtered.length > 0 && (
                <TableWrapper>
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="p-2 text-left text-xs font-semibold border-r w-8">#</th>
                            <th className="p-2 text-left text-xs font-semibold border-r">Name</th>
                            <th className="p-2 text-left text-xs font-semibold border-r">Description</th>
                            <th className="p-2 text-left text-xs font-semibold border-r">Params</th>
                            <th className="p-2 text-left text-xs font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((query, i) => (
                            <tr key={query.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="p-2 border-r text-gray-400 text-xs text-center">{i + 1}</td>
                                <td className="p-2 border-r font-semibold text-gray-800 text-sm">{query.name}</td>
                                <td className="p-2 border-r text-gray-600 text-xs max-w-xs">
                                    {query.description || <span className="text-gray-300">—</span>}
                                </td>
                                <td className="p-2 border-r">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                        {Object.keys(query.parameterDescriptions || {}).length} param(s)
                                    </span>
                                </td>
                                <td className="p-2">
                                    <button
                                        onClick={() => onExecute(query)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                                    >
                                        Execute
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * Self-contained named query browser.
 * Flow: Groups → Queries → Execute (with optional params) → Results
 */
const NamedQueryBrowser = ({ namedQuery, showPopup, isConnected }) => {
    const {
        groups, groupsLoading, groupsError, groupsFetched, fetchGroups,
        selectedGroup, queries, queriesLoading, queriesError, fetchQueries, backToGroups,
        executeQuery, clearResults, executeAllQueriesInGroup,
        resultData, resultLoading, resultError,
        bulkExecuting, bulkExecutionProgress,
    } = namedQuery;

    const [dialogQuery, setDialogQuery] = useState(null);
    const [filterQuery, setFilterQuery] = useState("");

    // Bulk execution state
    const [showBulkResults, setShowBulkResults] = useState(false);
    const [bulkResultsData, setBulkResultsData] = useState(null);

    // Auto-fetch groups on mount if not yet loaded and connected
    useEffect(() => {
        if (isConnected && !groupsFetched && !groupsLoading) fetchGroups();
    }, [isConnected, groupsFetched, groupsLoading, fetchGroups]);

    const handleExecute = async (queryName, params) => {
        try {
            await executeQuery(queryName, params);
            showPopup?.(`Query "${queryName}" executed successfully`, "success");
        } catch (err) {
            showPopup?.(`Failed: ${err.message}`, "error");
        }
    };

    const handleExecuteAllInGroup = async (group) => {
        try {
            // First fetch the queries for this group
            await fetchQueries(group);
            // Then execute all queries
            const result = await executeAllQueriesInGroup(group, queries);
            setShowBulkResults(true);
            setBulkResultsData(result);
            showPopup?.(`Executed ${result.results.length} queries successfully, ${result.errors.length} failed/skipped`, "success");
        } catch (err) {
            showPopup?.(`Failed: ${err.message}`, "error");
        }
    };

    const handleExecuteAllCurrentQueries = async () => {
        if (!selectedGroup) return;
        try {
            const result = await executeAllQueriesInGroup(selectedGroup, queries);
            setShowBulkResults(true);
            setBulkResultsData(result);
            showPopup?.(`Executed ${result.results.length} queries successfully, ${result.errors.length} failed/skipped`, "success");
        } catch (err) {
            showPopup?.(`Failed: ${err.message}`, "error");
        }
    };

    return (
        <div className="p-4 sm:p-6">
            {/* Connection required check */}
            {!isConnected && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Connection Required</h3>
                        <p className="text-yellow-700 text-sm">Please connect to a DazzleDuck server to access named queries.</p>
                    </div>
                </div>
            )}

            {/* Main content - only show when connected */}
            {isConnected && (
                <>
                    {/* Header with reload button */}
                    <div className="flex justify-between items-center mb-4">
                        {!selectedGroup && (
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-700 text-sm">
                                    Query Groups {groups.length > 0 && `(${groups.length})`}
                                </h3>
                                <button
                                    onClick={fetchGroups}
                                    disabled={groupsLoading}
                                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${groupsLoading
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                        }`}
                                    title="Reload groups"
                                >
                                    <IoReload className={groupsLoading ? "animate-spin" : ""} size={14} />
                                    {groupsLoading ? "Loading..." : "Reload"}
                                </button>
                            </div>
                        )}
                        {selectedGroup && (
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-700 text-sm">{selectedGroup}</h3>
                                <button
                                    onClick={() => { fetchQueries(selectedGroup); }}
                                    disabled={queriesLoading}
                                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${queriesLoading
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                        }`}
                                    title="Reload queries"
                                >
                                    <IoReload className={queriesLoading ? "animate-spin" : ""} size={14} />
                                    {queriesLoading ? "Loading..." : "Reload"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Search bar */}
                    {selectedGroup && (
                        <div className="mb-4 flex w-full sm:w-[60%] border border-gray-300 rounded-md overflow-hidden shadow-sm">
                            <input
                                type="text"
                                placeholder="Filter queries..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                className="flex-1 px-4 py-2 text-sm outline-none"
                            />
                            {filterQuery && (
                                <button
                                    onClick={() => setFilterQuery("")}
                                    className="px-3 text-gray-400 hover:text-gray-700"
                                >
                                    <IoIosClose size={18} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Groups or Queries view */}
                    {!selectedGroup ? (
                        <GroupsView
                            groups={groups}
                            loading={groupsLoading}
                            error={groupsError}
                            onSelectGroup={fetchQueries}
                            onExecuteAll={handleExecuteAllInGroup}
                        />
                    ) : (
                        <QueriesView
                            queries={queries}
                            loading={queriesLoading}
                            error={queriesError}
                            filterQuery={filterQuery}
                            onBack={() => {
                                backToGroups();
                                setFilterQuery("");
                                setShowBulkResults(false);
                                setBulkResultsData(null);
                            }}
                            onExecute={setDialogQuery}
                            onExecuteAll={handleExecuteAllCurrentQueries}
                            isExecutingAll={bulkExecuting}
                        />
                    )}

                    {/* Execution Results */}
                    {(resultData || resultLoading || resultError) && (
                        <div className="mt-8">
                            <DataTable
                                title="Execution Results"
                                data={resultData || []}
                                loading={resultLoading}
                                error={resultError}
                                // can also pass buttons in headerActions
                                onClear={clearResults}
                            />
                        </div>
                    )}

                    {/* Bulk Execution Progress */}
                    {bulkExecuting && (
                        <div className="mt-8">
                            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    Executing Queries&hellip; ({bulkExecutionProgress.current} / {bulkExecutionProgress.total})
                                </h3>
                                {/* Progress bar — width driven by a CSS variable so no inline style needed */}
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                                        <div
                                            className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-in-out"
                                            style={{ width: `${bulkExecutionProgress.total > 0 ? Math.round((bulkExecutionProgress.current / bulkExecutionProgress.total) * 100) : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap tabular-nums">
                                        {bulkExecutionProgress.total > 0
                                            ? Math.round((bulkExecutionProgress.current / bulkExecutionProgress.total) * 100)
                                            : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Execution Results */}
                    {showBulkResults && bulkResultsData && (
                        <div className="mt-15 space-y-6">

                            {/* ── Summary header ── */}
                            <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                                <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                                    <h3 className="text-base font-semibold text-white">
                                        Bulk Execution Results
                                    </h3>
                                    <button
                                        onClick={() => { setShowBulkResults(false); setBulkResultsData(null); }}
                                        className="px-3 py-1 rounded font-medium text-red-300 border border-red-400/30 bg-red-500/10 hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
                                        aria-label="Clear results"
                                        title="Close results"
                                    >
                                        ✕ Clear
                                    </button>
                                </div>
                                <div className="p-4 flex gap-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1 text-center">
                                        <p className="text-xs font-semibold text-green-800 mb-1">Successful</p>
                                        <p className="text-2xl font-bold text-green-700">{bulkResultsData.results.length}</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex-1 text-center">
                                        <p className="text-xs font-semibold text-red-800 mb-1">Failed</p>
                                        <p className="text-2xl font-bold text-red-700">{bulkResultsData.errors.length}</p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1 text-center">
                                        <p className="text-xs font-semibold text-blue-800 mb-1">Total</p>
                                        <p className="text-2xl font-bold text-blue-700">{bulkResultsData.total}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Per-query DataTables ── */}
                            {bulkResultsData.results.map((result) => (
                                <div className="mt-15">
                                    <DataTable
                                        key={result.queryName}
                                        title={result.queryName}
                                        data={result.data || []}
                                        emptyText="Query returned no rows."
                                    />
                                </div>
                            ))}

                            {/* ── Failed queries ── */}
                            {bulkResultsData.errors.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                                    <div className="bg-red-700 px-4 py-3">
                                        <h4 className="text-sm font-semibold text-white">
                                            Failed Queries ({bulkResultsData.errors.length})
                                        </h4>
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
                                                {bulkResultsData.errors.map((err, i) => (
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
                    )}
                </>
            )}

            {/* Parameter Dialog */}
            {dialogQuery && (
                <ParameterDialog
                    query={dialogQuery}
                    onClose={() => setDialogQuery(null)}
                    onExecute={handleExecute}
                />
            )}
        </div>
    );
};

export default NamedQueryBrowser;