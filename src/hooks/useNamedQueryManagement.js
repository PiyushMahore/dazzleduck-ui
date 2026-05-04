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
    const [resultLoading, setResultLoading] = useState(false);
    const [resultError, setResultError] = useState("");

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
        } catch (err) {
            setGroupsError(err?.message || "Failed to fetch groups");
        } finally {
            setGroupsLoading(false);
            setGroupsFetched(true);
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

    const executeQuery = useCallback(async (queryName, parameters) => {
        if (!url) {
            const msg = "No server URL - please connect first";
            setResultError(msg);
            throw new Error(msg);
        }
        setResultLoading(true);
        setResultError("");
        setResultData(null);
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

    const clearResults = useCallback(() => {
        setResultData(null);
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
        setResultError("");
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
        resultData,
        resultLoading,
        resultError,
    };
};