import React, { useEffect, useRef, useState } from "react";
import { IoIosClose } from "react-icons/io";
import { IoReload } from "react-icons/io5";
import {
    GroupsView,
    QueriesView,
    QueryResultDisplay,
    BulkResultsSummary,
    ParameterDialog,
} from "./QueryViews";

/**
 * Self-contained named query browser.
 * Flow: Groups → Queries → Execute (with optional params) → Results
 *
 * Props:
 *   namedQuery   – object returned by useNamedQueryManagement
 *   showPopup    – (message, type) => void
 *   isConnected  – boolean
 */
const NamedQueryBrowser = ({ namedQuery, showPopup, isConnected }) => {
    const {
        groups, groupsLoading, groupsError, groupsFetched, fetchGroups,
        selectedGroup, queries, queriesLoading, queriesError, fetchQueries, backToGroups,
        executeQuery, clearResults, executeAllQueriesInGroup,
        resultData, resultQueryMeta, resultLoading, resultError,
        bulkExecuting,
    } = namedQuery;

    const [dialogQuery, setDialogQuery] = useState(null);
    const [filterQuery, setFilterQuery] = useState("");
    const [showBulkResults, setShowBulkResults] = useState(false);
    const [bulkResultsData, setBulkResultsData] = useState(null);
    const [displayOverrides, setDisplayOverrides] = useState({});

    const isExecutingRef = useRef(false);
    const autoFetchAttemptedRef = useRef(false);

    useEffect(() => {
        if (!isConnected) {
            autoFetchAttemptedRef.current = false;
        }
    }, [isConnected]);

    // ── Auto-fetch groups once connected ──────────────────────────────────────
    useEffect(() => {
        let alive = true;
        if (isConnected && !groupsFetched && !groupsLoading && !autoFetchAttemptedRef.current) {
            autoFetchAttemptedRef.current = true;
            fetchGroups().catch((err) => alive && console.error("Failed to fetch groups:", err));
        }
        return () => { alive = false; };
    }, [isConnected, groupsFetched, groupsLoading, fetchGroups]);

    // ── Display override helpers ──────────────────────────────────────────────
    const handleDisplayChange = (queryName, type) =>
        setDisplayOverrides((prev) => ({ ...prev, [queryName]: type }));

    const clearDisplayOverrides = () => setDisplayOverrides({});

    // ── Single query execute ──────────────────────────────────────────────────
    const handleExecute = async (queryName, params, queryMeta = null) => {
        try {
            await executeQuery(queryName, params, queryMeta);
            showPopup?.(`Query "${queryName}" executed successfully`, "success");
        } catch (err) {
            showPopup?.(`Failed: ${err.message}`, "error");
        }
    };

    const handleClearResults = () => { clearResults(); clearDisplayOverrides(); };

    // ── Bulk execute (shared logic for group-level and queries-view) ──────────
    const handleBulkExecute = async (group, queriesList) => {
        if (isExecutingRef.current) {
            showPopup?.("Another bulk execution is already in progress. Please wait.", "error");
            return;
        }
        isExecutingRef.current = true;
        try {
            const result = await executeAllQueriesInGroup(group, queriesList);
            setShowBulkResults(true);
            setBulkResultsData(result);
            showPopup?.(
                `Executed ${result.results.length} queries successfully, ${result.errors.length} failed/skipped`,
                "success"
            );
        } catch (err) {
            showPopup?.(`Failed: ${err.message}`, "error");
        } finally {
            isExecutingRef.current = false;
        }
    };

    // Called from GroupsView — group may not be loaded yet, pass null list
    const handleExecuteAllInGroup = async (group) => {
        await fetchQueries(group);
        await handleBulkExecute(group, queries);
    };

    // Called from QueriesView — queries already loaded in state
    const handleExecuteAllCurrentQueries = () =>
        selectedGroup && handleBulkExecute(selectedGroup, queries);

    // ── Back navigation ───────────────────────────────────────────────────────
    const handleBack = () => {
        backToGroups();
        setFilterQuery("");
        setShowBulkResults(false);
        setBulkResultsData(null);
        clearDisplayOverrides();
    };

    // ── Reload button (shared between groups and queries view) ────────────────
    const ReloadButton = ({ onClick, loading, label }) => (
        <button
            onClick={onClick}
            disabled={loading}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${loading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
        >
            <IoReload className={loading ? "animate-spin" : ""} size={14} />
            {loading ? "Loading..." : label}
        </button>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Connection Required</h3>
                    <p className="text-yellow-700 text-sm">Please connect to a DazzleDuck server to access named queries.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6">
            {/* ── Header ── */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-700 text-sm">
                        {selectedGroup
                            ? selectedGroup
                            : `Query Groups${groups.length > 0 ? ` (${groups.length})` : ""}`}
                    </h3>
                    <ReloadButton
                        onClick={selectedGroup ? () => fetchQueries(selectedGroup) : fetchGroups}
                        loading={selectedGroup ? queriesLoading : groupsLoading}
                        label="Reload"
                    />
                </div>
            </div>

            {/* ── Filter bar (queries view only) ── */}
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
                        <button onClick={() => setFilterQuery("")} className="px-3 text-gray-400 hover:text-gray-700">
                            <IoIosClose size={18} />
                        </button>
                    )}
                </div>
            )}

            {/* ── Groups or Queries view ── */}
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
                    onBack={handleBack}
                    onExecute={setDialogQuery}
                    onExecuteAll={handleExecuteAllCurrentQueries}
                    isExecutingAll={bulkExecuting}
                />
            )}

            {/* ── Single query result ── */}
            {(resultData || resultLoading || resultError) && resultQueryMeta && (
                <div className="mt-15">
                    <QueryResultDisplay
                        queryName={resultQueryMeta.name || "Query Results"}
                        data={resultData || []}
                        preferredDisplay={resultQueryMeta.preferred_display || "table"}
                        currentDisplay={displayOverrides[resultQueryMeta.name]}
                        onDisplayChange={(type) => handleDisplayChange(resultQueryMeta.name, type)}
                    />
                    <div className="mt-2 flex justify-end">
                        <button
                            onClick={handleClearResults}
                            className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
                        >
                            Clear Results
                        </button>
                    </div>
                </div>
            )}

            {/* ── Bulk results ── */}
            {showBulkResults && bulkResultsData && (
                <BulkResultsSummary
                    bulkResultsData={bulkResultsData}
                    displayOverrides={displayOverrides}
                    onDisplayChange={handleDisplayChange}
                    onClear={() => { setShowBulkResults(false); setBulkResultsData(null); }}
                />
            )}

            {/* ── Parameter dialog ── */}
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
