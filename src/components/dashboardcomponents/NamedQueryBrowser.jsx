import React, { useEffect, useState, useRef } from "react";
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

/**
 * Performant Table Component with Pagination
 * Handles large datasets (1000+ rows) efficiently
 */
const PerformantTable = ({
    columns,
    data,
    loading,
    error,
    emptyText,
    rowKey,
    defaultRowsPerPage = 20,
    title
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

    // Reset to page 1 when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    // Calculate pagination
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    // Row size options
    const rowSizeOptions = [10, 20, 50, 100];

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
                {data.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300">
                            {data.length.toLocaleString()} items
                        </span>
                        {totalPages > 1 && (
                            <span className="text-xs text-gray-400">
                                • Page {currentPage} of {totalPages}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : error ? (
                <div className="p-4 text-center">
                    <pre className="text-red-600 text-xs whitespace-pre-wrap">{error}</pre>
                </div>
            ) : data.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">{emptyText}</div>
            ) : (
                <>
                    {/* Controls */}
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Rows per page:</label>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                                {rowSizeOptions.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ‹
                                </button>
                                <span className="text-xs text-gray-600 px-2">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ›
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    {columns.map((col, index) => (
                                        <th
                                            key={index}
                                            className={`p-2 text-left text-xs font-semibold border-r border-gray-200 ${col.width || ''}`}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((row, rowIndex) => (
                                    <tr
                                        key={rowKey ? rowKey(row, startIndex + rowIndex) : startIndex + rowIndex}
                                        className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                    >
                                        {columns.map((col, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className={`p-2 border-r border-gray-200 ${col.cellClassName || ''}`}
                                            >
                                                {col.render ? col.render(row, startIndex + rowIndex) : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Parameter Dialog ────────────────────────────────────────────────────────

const ParameterDialog = ({ query, onClose, onExecute }) => {
    const [params, setParams] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const paramEntries = Object.entries(query.parameterDescriptions || {});

    // Input validation function - more lenient to allow defaults
    const validateParameter = (key, value) => {
        const paramDesc = query.parameterDescriptions?.[key];
        if (!paramDesc) return null;

        const errors = [];

        // Skip validation for empty values (assume they have defaults)
        // Only validate if user actually provided a value
        if (!value || value.trim() === '') {
            return null; // Allow empty - will use default parameters
        }

        // Basic validation based on parameter type
        const desc = typeof paramDesc === 'object' && paramDesc !== null
            ? (paramDesc.value || paramDesc.description || JSON.stringify(paramDesc))
            : paramDesc;

        // Basic length validation to prevent excessively long input
        if (value.length > 10000) {
            errors.push('Input too long (max 10000 characters)');
        }

        // Type validation based on description hints (UX improvement, not security)
        if (typeof desc === 'string') {
            if (desc.toLowerCase().includes('number') || desc.toLowerCase().includes('integer')) {
                if (isNaN(Number(value))) {
                    errors.push('Must be a valid number');
                }
            }
            if (desc.toLowerCase().includes('date')) {
                if (isNaN(Date.parse(value))) {
                    errors.push('Must be a valid date');
                }
            }
        }

        return errors.length > 0 ? errors : null;
    };

    const handleExecute = () => {
        // Validate all parameters before execution
        const errors = {};
        let isValid = true;

        paramEntries.forEach(([key]) => {
            const validationError = validateParameter(key, params[key]);
            if (validationError) {
                errors[key] = validationError;
                isValid = false;
            }
        });

        if (!isValid) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors({});
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
                            const hasError = validationErrors[key] && validationErrors[key].length > 0;
                            return (
                                <div key={key}>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">{key}</label>
                                    {desc && <p className="text-xs text-gray-400 mb-1">{desc}</p>}
                                    <input
                                        type="text"
                                        value={params[key] || ""}
                                        onChange={(e) => {
                                            setParams((p) => ({ ...p, [key]: e.target.value }));
                                            // Clear validation error when user starts typing
                                            if (validationErrors[key]) {
                                                setValidationErrors((prev) => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[key];
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        placeholder={`Enter ${key}`}
                                        className={`w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 ${
                                            hasError
                                                ? 'border-red-500 focus:ring-red-500'
                                                : 'border-gray-300 focus:ring-green-500'
                                        }`}
                                    />
                                    {hasError && (
                                        <p className="text-xs text-red-600 mt-1">
                                            {validationErrors[key].join(', ')}
                                        </p>
                                    )}
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

const GroupsView = ({ groups, loading, error, onSelectGroup, onExecuteAll }) => {
    const columns = [
        {
            key: 'index',
            label: '#',
            width: 'w-8',
            render: (_, index) => (
                <span className="text-gray-400 text-xs text-center block">{index + 1}</span>
            )
        },
        {
            key: 'query_group',
            label: 'Group',
            render: (group) => (
                <span className="font-semibold text-gray-800 text-sm">{group.query_group}</span>
            )
        },
        {
            key: 'query_count',
            label: 'Queries',
            render: (group) => (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                    {group.ids?.length ?? 0} queries
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (group) => (
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
            )
        }
    ];

    return (
        <PerformantTable
            columns={columns}
            data={groups}
            loading={loading}
            error={error}
            emptyText="No groups available."
            rowKey={(group) => group.query_group}
            defaultRowsPerPage={10}
            title="Query Groups"
        />
    );
};

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

    const columns = [
        {
            key: 'index',
            label: '#',
            width: 'w-8',
            render: (_, index) => (
                <span className="text-gray-400 text-xs text-center block">{index + 1}</span>
            )
        },
        {
            key: 'name',
            label: 'Name',
            render: (query) => (
                <span className="font-semibold text-gray-800 text-sm">{query.name}</span>
            )
        },
        {
            key: 'description',
            label: 'Description',
            cellClassName: 'text-gray-600 text-xs max-w-xs',
            render: (query) => (
                query.description || <span className="text-gray-300">—</span>
            )
        },
        {
            key: 'params',
            label: 'Params',
            render: (query) => (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                    {Object.keys(query.parameterDescriptions || {}).length} param(s)
                </span>
            )
        },
        {
            key: 'action',
            label: 'Action',
            render: (query) => (
                <button
                    onClick={() => onExecute(query)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                >
                    Execute
                </button>
            )
        }
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
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${isExecutingAll
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
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
                    rowKey={(query) => query.name}
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
        bulkExecuting,
    } = namedQuery;

    const [dialogQuery, setDialogQuery] = useState(null);
    const [filterQuery, setFilterQuery] = useState("");

    // Bulk execution state
    const [showBulkResults, setShowBulkResults] = useState(false);
    const [bulkResultsData, setBulkResultsData] = useState(null);

    // Execution lock to prevent race conditions
    const isExecutingRef = useRef(false);

    // Auto-fetch groups on mount if not yet loaded and connected
    useEffect(() => {
        let isMounted = true;

        const fetchGroupsIfNeeded = async () => {
            if (isConnected && !groupsFetched && !groupsLoading && isMounted) {
                try {
                    await fetchGroups();
                } catch (error) {
                    // Only log error if component is still mounted
                    if (isMounted) {
                        console.error('Failed to fetch groups:', error);
                    }
                }
            }
        };

        fetchGroupsIfNeeded();

        // Cleanup function to prevent memory leaks
        return () => {
            isMounted = false;
        };
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
        // Prevent concurrent executions
        if (isExecutingRef.current) {
            showPopup?.('Another bulk execution is already in progress. Please wait.', 'error');
            return;
        }

        isExecutingRef.current = true;

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
        } finally {
            isExecutingRef.current = false;
        }
    };

    const handleExecuteAllCurrentQueries = async () => {
        if (!selectedGroup) return;

        // Prevent concurrent executions
        if (isExecutingRef.current) {
            showPopup?.('Another bulk execution is already in progress. Please wait.', 'error');
            return;
        }

        isExecutingRef.current = true;

        try {
            const result = await executeAllQueriesInGroup(selectedGroup, queries);
            setShowBulkResults(true);
            setBulkResultsData(result);
            showPopup?.(`Executed ${result.results.length} queries successfully, ${result.errors.length} failed/skipped`, "success");
        } catch (err) {
            showPopup?.(`Failed: ${err.message}`, "error");
        } finally {
            isExecutingRef.current = false;
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
                            {bulkResultsData.results.map((result, index) => (
                                <div key={result.queryName || index} className="mt-15">
                                    <DataTable
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