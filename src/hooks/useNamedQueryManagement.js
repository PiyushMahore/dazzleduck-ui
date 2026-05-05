import { useState, useCallback } from "react";
import { useQueryDashboard } from "../context/QueryDashboardContext";

/**
 * Hook for managing named queries: groups → queries → execute
 * All API logic delegated to QueryDashboardContext.
 */
export const useNamedQueryManagement = ({ url }) => {
    const {
        fetchNamedQueries: apiFetchQueries,
        fetchNamedQueryGroups: apiFetchGroups,
        executeNamedQuery: apiExecuteQuery,
    } = useQueryDashboard();

    // Groups
    const [groups, setGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [groupsError, setGroupsError] = useState("");
    const [groupsFetched, setGroupsFetched] = useState(false);

    // Queries within a selected group
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

    const fetchGroups = useCallback(async () => {
        if (!url) {
            setGroupsError("No server URL - please connect first");
            return;
        }
        setGroupsLoading(true);
        setGroupsError("");
        try {
            const data = await apiFetchGroups(url);
            setGroups(data);
            setGroupsFetched(true);
        } catch (err) {
            setGroupsFetched(false);
            setGroupsError(err?.message || "Failed to fetch groups");
        } finally {
            setGroupsLoading(false);
        }
    }, [url, apiFetchGroups]);

    const fetchQueries = useCallback(async (group) => {
        if (!url) {
            setQueriesError("No server URL - please connect first");
            return;
        }
        setSelectedGroup(group);
        setQueriesLoading(true);
        setQueriesError("");
        setQueries([]);
        try {
            const data = await apiFetchQueries(url, 0, 200, group);
            setQueries(data);
        } catch (err) {
            setQueriesError(err?.message || "Failed to fetch queries");
        } finally {
            setQueriesLoading(false);
        }
    }, [url, apiFetchQueries]);

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
     * @param {string} group - group name; used to fetch queries when no list is pre-loaded
     * @param {Array|null} queriesList - pass the already-fetched list, or null to fetch fresh
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
            // If no list was supplied (called from groups view before queries were loaded),
            // fetch directly and use the returned value — don't rely on async state update.
            let list = queriesList;
            if (!list || list.length === 0) {
                setQueriesLoading(true);
                try {
                    list = await apiFetchQueries(url, 0, 200, group);
                    setQueries(list);
                    setSelectedGroup(group);
                } catch (err) {
                    throw new Error(`Failed to load queries for group "${group}": ${err.message}`);
                } finally {
                    setQueriesLoading(false);
                }
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
    }, [url, apiFetchQueries, apiExecuteQuery]);

    const clearResults = useCallback(() => {
        setResultData(null);
        setResultQueryMeta(null);
        setResultError("");
    }, []);

    const resetAll = useCallback(() => {
        // Reset all state when connection is lost
        setGroups([]);
        setGroupsError("");
        setGroupsFetched(false);
        setQueries([]);
        setQueriesError("");
        setSelectedGroup(null);
        setResultData(null);
        setResultQueryMeta(null);
        setResultError("");
        setBulkExecutionProgress({ current: 0, total: 0 });
        setBulkExecutionResults([]);
        setBulkExecuting(false);
    }, []);

    return {
        // Groups
        groups,
        groupsLoading,
        groupsError,
        groupsFetched,
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
