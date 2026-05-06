import { useState, useCallback } from "react";
import { useQueryDashboard } from "../context/QueryDashboardContext";

/**
 * Hook for managing named queries: groups → queries → execute
 * All API logic delegated to QueryDashboardContext.
 * Updated to work with new backend API: fetch all queries and group locally.
 */
export const useNamedQueryManagement = ({ url }) => {
    const {
        fetchNamedQueries: apiFetchQueries,
        executeNamedQuery: apiExecuteQuery,
    } = useQueryDashboard();

    // All named queries fetched from backend
    const [allQueries, setAllQueries] = useState([]);
    const [allQueriesLoading, setAllQueriesLoading] = useState(false);
    const [allQueriesError, setAllQueriesError] = useState("");
    const [allQueriesFetched, setAllQueriesFetched] = useState(false);

    // Groups (derived from all queries)
    const [groups, setGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [groupsError, setGroupsError] = useState("");

    // Queries within a selected group (filtered from all queries)
    const [queries, setQueries] = useState([]);
    const [queriesLoading, setQueriesLoading] = useState(false);
    const [queriesError, setQueriesError] = useState("");
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Execution results
    const [resultData, setResultData] = useState(null);
    const [resultQueryMeta, setResultQueryMeta] = useState(null); // Store query metadata for single query execution
    const [resultLoading, setResultLoading] = useState(false);
    const [resultError, setResultError] = useState("");

    // Bulk execution state
    const [bulkExecutionProgress, setBulkExecutionProgress] = useState({ current: 0, total: 0 });
    const [bulkExecutionResults, setBulkExecutionResults] = useState([]);
    const [bulkExecuting, setBulkExecuting] = useState(false);

    /**
     * Fetch all named queries and derive groups from query_group field
     */
    const fetchAllNamedQueries = useCallback(async () => {
        if (!url) {
            setAllQueriesError("No server URL - please connect first");
            return;
        }
        setAllQueriesLoading(true);
        setAllQueriesError("");
        try {
            // Fetch all named queries without group filter
            const data = await apiFetchQueries(url, 0, 1000, null);
            setAllQueries(data);
            setAllQueriesFetched(true);

            // Derive groups from query_group field
            const groupMap = new Map();
            data.forEach(query => {
                const groupName = query.query_group || 'uncategorized';
                if (!groupMap.has(groupName)) {
                    groupMap.set(groupName, {
                        query_group: groupName,
                        ids: []
                    });
                }
                groupMap.get(groupName).ids.push(query.id);
            });

            setGroups(Array.from(groupMap.values()));
            setGroupsError("");
        } catch (err) {
            setAllQueriesFetched(false);
            setAllQueriesError(err?.message || "Failed to fetch named queries");
            setGroupsError(err?.message || "Failed to fetch named queries");
        } finally {
            setAllQueriesLoading(false);
        }
    }, [url, apiFetchQueries]);

    const fetchGroups = useCallback(async () => {
        // Groups are now derived from all queries
        if (allQueries.length > 0 && allQueriesFetched) {
            return; // Already have groups
        }
        await fetchAllNamedQueries();
    }, [allQueries.length, allQueriesFetched, fetchAllNamedQueries]);

    const fetchQueries = useCallback(async (group) => {
        if (!url) {
            setQueriesError("No server URL - please connect first");
            return;
        }
        setSelectedGroup(group);
        setQueriesLoading(true);
        setQueriesError("");
        try {
            // Filter queries locally by group
            const filteredQueries = allQueries.filter(q =>
                (q.query_group || 'uncategorized') === group
            );
            setQueries(filteredQueries);
            setQueriesError("");
        } catch (err) {
            setQueriesError(err?.message || "Failed to filter queries");
        } finally {
            setQueriesLoading(false);
        }
    }, [url, allQueries]);

    const backToGroups = useCallback(() => {
        setSelectedGroup(null);
        setQueries([]);
        setQueriesError("");
        setResultData(null);
        setResultError("");
    }, []);

    const executeQuery = useCallback(async (queryName, parameters, queryMeta = null) => {
        if (!url) {
            const msg = "No server URL - please connect first";
            setResultError(msg);
            throw new Error(msg);
        }
        setResultLoading(true);
        setResultError("");
        setResultData(null);
        setResultQueryMeta(queryMeta); // Store query metadata
        try {
            const data = await apiExecuteQuery(url, queryName, parameters);
            setResultData(data);
            return data;
        } catch (err) {
            const msg = err?.message || "Failed to execute query";
            setResultError(msg);
            throw new Error(msg);
        } finally {
            setResultLoading(false);
        }
    }, [url, apiExecuteQuery]);

    /**
     * Execute all queries in a group.
     *
     * @param {string} group - group name; used to filter queries from all queries
     * @param {Array|null} queriesList - pass the already-fetched list, or null to filter from all queries
     *
     * Each result now includes `preferredDisplay` (from query.preferred_display) so
     * the UI can render each result with the correct view (table, line, bar, pie).
     */
    const executeAllQueriesInGroup = useCallback(async (group, queriesList = null) => {
        if (!url) throw new Error("No server URL - please connect first");

        setBulkExecuting(true);
        setBulkExecutionProgress({ current: 0, total: 0 });
        setBulkExecutionResults([]);
        setResultData(null);
        setResultError("");

        const results = [];
        const errors = [];

        try {
            // Use provided list or filter from all queries
            let list = queriesList;
            if (!list || list.length === 0) {
                list = allQueries.filter(q =>
                    (q.query_group || 'uncategorized') === group
                );
            }

            if (!list || list.length === 0) throw new Error(`No queries found in group "${group}"`);

            setBulkExecutionProgress({ current: 0, total: list.length });

            for (let i = 0; i < list.length; i++) {
                const query = list[i];
                setBulkExecutionProgress({ current: i + 1, total: list.length });

                try {
                    // Always attempt with empty params — optional params use server-side
                    // defaults (e.g. `limit | default('20')`). Only skip if the API rejects.
                    const data = await apiExecuteQuery(url, query.name, {});
                    results.push({
                        queryName: query.name,
                        // Carry preferred_display so each result renders with the right view
                        preferredDisplay: query.preferred_display || "table",
                        success: true,
                        data,
                        rowCount: Array.isArray(data) ? data.length : 0,
                    });
                } catch (err) {
                    errors.push({
                        queryName: query.name,
                        error: err?.message || "Execution failed",
                    });
                }
            }

            setBulkExecutionResults(results);
            return { results, errors, total: list.length };
        } catch (err) {
            const msg = err?.message || "Failed to execute queries";
            setResultError(msg);
            throw new Error(msg);
        } finally {
            setBulkExecuting(false);
        }
    }, [url, allQueries, apiExecuteQuery]);

    const clearResults = useCallback(() => {
        setResultData(null);
        setResultQueryMeta(null);
        setResultError("");
    }, []);

    const resetAll = useCallback(() => {
        // Reset all state when connection is lost
        setAllQueries([]);
        setAllQueriesError("");
        setAllQueriesFetched(false);
        setAllQueriesLoading(false);
        setGroups([]);
        setGroupsError("");
        setGroupsLoading(false);
        setQueries([]);
        setQueriesError("");
        setQueriesLoading(false);
        setSelectedGroup(null);
        setResultData(null);
        setResultQueryMeta(null);
        setResultError("");
        setBulkExecutionProgress({ current: 0, total: 0 });
        setBulkExecutionResults([]);
        setBulkExecuting(false);
    }, []);

    return {
        // All queries
        allQueries,
        allQueriesLoading,
        allQueriesError,
        allQueriesFetched,
        fetchAllNamedQueries,
        // Groups (derived from all queries)
        groups,
        groupsLoading,
        groupsError,
        fetchGroups,
        // Queries
        selectedGroup,
        queries,
        queriesLoading,
        queriesError,
        fetchQueries,
        backToGroups,
        // Execution
        executeQuery,
        clearResults,
        resetAll,
        executeAllQueriesInGroup,
        resultData,
        resultQueryMeta,
        resultLoading,
        resultError,
        // Bulk execution
        bulkExecuting,
        bulkExecutionProgress,
        bulkExecutionResults,
    };
};
