import React, { useState } from "react";
import { HiOutlineArrowUp, HiOutlineArrowDown } from "react-icons/hi";
import { BsSearch } from "react-icons/bs";
import "../App.css";
import { useQueryDashboard } from "../context/QueryDashboardContext";
import { useQueryManagement } from "../hooks/useQueryManagement";
import { useConnectionForm } from "../hooks/useConnectionForm";
import { useSessionManagement } from "../hooks/useSessionManagement";
import { useNamedQueryManagement } from "../hooks/useNamedQueryManagement";
import ConnectionPanel from "../components/dashboardcomponents/ConnectionPanel";
import QueryRow from "../components/dashboardcomponents/QueryRow";
import PopupMessage from "../components/utils/PopupMessage";
import DataTable from "../components/dashboardcomponents/DataTable";
import NamedQueryBrowser from "../components/dashboardcomponents/namedquery/NamedQueryBrowser";

const QueryDashboard = () => {
    const {
        executeQuery,
        login,
        loginWithJwt,
        logout,
        cancelQuery,
        saveSession,
        loadSession,
        loadSessionFromUrl,
        restoreSession,
        connectionInfo,
    } = useQueryDashboard();

    const [activeTab, setActiveTab] = useState("analytics"); // "analytics" | "search" | "named"

    const [popup, setPopup] = useState({ message: "", type: "", visible: false });
    const showPopup = (message, type = "success") => setPopup({ message, type, visible: true });

    const [showConnection, setShowConnection] = useState(true);

    // Connection form management
    const connectionForm = useConnectionForm(login, loginWithJwt, logout, connectionInfo);

    // Named query management
    const namedQuery = useNamedQueryManagement({
        url: connectionForm.connection?.url,
    });

    // Query management
    const queryManagement = useQueryManagement(
        executeQuery,
        cancelQuery,
        connectionForm.isConnected,
        connectionForm.connection
    );

    // Session management
    const sessionManagement = useSessionManagement(
        saveSession,
        loadSession,
        loadSessionFromUrl,
        restoreSession,
        queryManagement.rows,
        connectionForm.populateConnectionData,
        queryManagement.restoreRows,
        showPopup
    );

    const handleLogout = () => {
        connectionForm.handleLogout();
        queryManagement.resetRows();
        namedQuery.resetAll();
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
    const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

    return (
        <div className="relative min-h-screen bg-linear-to-br from-gray-50 to-gray-200 p-10 space-y-10">
            {/* Connection Panel */}
            <ConnectionPanel
                showConnection={showConnection}
                setShowConnection={setShowConnection}
                isConnected={connectionForm.isConnected}
                register={connectionForm.register}
                handleSubmit={connectionForm.handleSubmit}
                onSubmit={connectionForm.onSubmit}
                onSubmitJwt={connectionForm.onSubmitJwt}
                errors={connectionForm.errors}
                isSubmitted={connectionForm.isSubmitted}
                isSubmitting={connectionForm.isSubmitting}
                loginError={connectionForm.loginError}
                handleLogout={handleLogout}
                showAdvanced={connectionForm.showAdvanced}
                setShowAdvanced={connectionForm.setShowAdvanced}
                claims={connectionForm.claims}
                addClaim={connectionForm.addClaim}
                removeClaim={connectionForm.removeClaim}
                updateClaim={connectionForm.updateClaim}
                fileInputRef={sessionManagement.fileInputRef}
                handleSaveSession={sessionManagement.handleSaveSession}
                handleOpenSession={sessionManagement.handleOpenSession}
                handleImportFromUrl={sessionManagement.handleImportFromUrl}
                openFileDialog={sessionManagement.openFileDialog}
                sessionName={sessionManagement.sessionName}
                jwtMode={connectionForm.jwtMode}
                setJwtMode={connectionForm.setJwtMode}
                jwtToken={connectionForm.jwtToken}
                setJwtToken={connectionForm.setJwtToken}
            />

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-400 pb-2 ml-5 overflow-hidden">
                {[
                    { id: "analytics", label: "Analytics" },
                    { id: "search",    label: "Search" },
                    { id: "named",     label: "Named Queries" },
                ].map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`px-4 pt-2 pb-3 font-semibold rounded-t-md border border-b-0 cursor-pointer transition-all duration-300 transform ${
                            activeTab === id
                                ? "bg-gray-300 border-gray-600 translate-y-4"
                                : "bg-gray-200 border-gray-200 text-gray-600 hover:text-gray-900 translate-y-3"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
                <>
                    {queryManagement.rows.map((row) => (
                        <QueryRow
                            key={row.id}
                            row={row}
                            result={queryManagement.results[row.id]}
                            queryId={queryManagement.queryIds[row.id]}
                            isConnected={connectionForm.isConnected}
                            isCancelling={queryManagement.cancellingQueries[row.id]}
                            totalRows={queryManagement.rows.length}
                            updateRow={queryManagement.updateRow}
                            removeRow={queryManagement.removeRow}
                            handleRunQuery={queryManagement.handleRunQuery}
                            handleCancelQuery={queryManagement.handleCancelQuery}
                            clearRowResults={queryManagement.clearRowResults}
                        />
                    ))}

                    <div className="flex justify-evenly mt-10 gap-5">
                        <button
                            onClick={queryManagement.addRow}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-md cursor-pointer"
                        >
                            Add New Query Row
                        </button>
                        <div className="flex gap-5">
                            <button
                                onClick={queryManagement.toggleAllRows}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-md cursor-pointer"
                            >
                                {queryManagement.rows.every((row) => !row.showPanel) ? "Show Queries" : "Hide Queries"}
                            </button>
                            <button
                                onClick={queryManagement.runAllQueries}
                                disabled={!connectionForm.isConnected || queryManagement.isRunningAll}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md disabled:opacity-50 cursor-pointer"
                            >
                                {queryManagement.isRunningAll ? "Running..." : "Run Queries"}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Search Tab */}
            {activeTab === "search" && (
                <DataTable
                    title="Search Results"
                    data={queryManagement.searchData}
                    loading={queryManagement.searchLoading}
                    error={queryManagement.searchError}
                    headerSlot={
                        <div className="bg-white border-b border-gray-300 shadow-md p-3 sm:p-4 md:p-6 flex flex-col items-center gap-3">
                            <div className="flex w-full sm:w-[90%] md:w-[80%] border border-gray-400 rounded-md p-1 font-mono shadow-sm">
                                <input
                                    type="text"
                                    placeholder="Search data with SQL query..."
                                    value={queryManagement.searchQuery}
                                    onChange={(e) => queryManagement.setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && queryManagement.runSearchQuery(queryManagement.searchQuery)}
                                    className="flex-1 p-1 sm:p-2 outline-none px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm"
                                />
                                <button
                                    onClick={() => queryManagement.runSearchQuery(queryManagement.searchQuery)}
                                    className="px-3 sm:px-5 py-1 sm:py-2 border-l border-gray-400 hover:bg-gray-100"
                                >
                                    <BsSearch className="text-base sm:text-xl" />
                                </button>
                            </div>
                        </div>
                    }
                />
            )}

            {/* Named Queries Tab */}
            {activeTab === "named" && (
                <div className="bg-white rounded-md shadow-xl mx-2 sm:mx-4 md:mx-10">
                    <div className="bg-gray-300 p-2 sm:p-3 flex items-center rounded-t-md shadow-md">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-wide">Named Queries</h2>
                    </div>
                    <NamedQueryBrowser namedQuery={namedQuery} showPopup={showPopup} isConnected={connectionForm.isConnected} />
                </div>
            )}

            {/* Scroll buttons */}
            <div className="hidden md:flex fixed bottom-5 right-2 xl:right-5 flex-col gap-2 z-50">
                <button
                    onClick={scrollToTop}
                    className="w-8 h-8 bg-neutral-600 hover:bg-neutral-700 text-white rounded-full shadow-lg flex items-center justify-center transition cursor-pointer"
                    title="Scroll to Top"
                >
                    <HiOutlineArrowUp size={17} />
                </button>
                <button
                    onClick={scrollToBottom}
                    className="w-8 h-8 bg-neutral-600 hover:bg-neutral-700 text-white rounded-full shadow-lg flex items-center justify-center transition cursor-pointer"
                    title="Scroll to Bottom"
                >
                    <HiOutlineArrowDown size={17} />
                </button>
            </div>

            <PopupMessage
                message={popup.message}
                type={popup.type}
                visible={popup.visible}
                onClose={() => setPopup({ message: "", type: "", visible: false })}
            />
        </div>
    );
};

export default QueryDashboard;