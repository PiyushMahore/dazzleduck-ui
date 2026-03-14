import React, { useEffect, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { IoIosSave } from "react-icons/io";
import { formatPossibleDate } from "../utils/DateNormalizer";

const SearchTable = ({
    title = "Search Results",
    data = [],
    loading = false,
    searchQuery,
    setSearchQuery,
    onSearch,
    error = "",
}) => {
    const [expandedRows, setExpandedRows] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const rowsPerPage = 10;

    const toggleRow = (i) =>
        setExpandedRows((prev) => ({ ...prev, [i]: !prev[i] }));

    // Pagination
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const paginatedData = data.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    return (
        <div className="min-h-screen font-sans flex flex-col">
            <div className="mx-2 sm:mx-4 md:mx-10 rounded-md shadow-xl">

                {/* ================= Header ================= */}
                <div className="bg-gray-300 p-2 sm:p-3 flex justify-between items-center rounded-t-md shadow-md">
                    <div className="text-lg sm:text-xl md:text-2xl font-semibold tracking-wide">
                        {title}
                    </div>
                    <button className="px-2 sm:px-3 py-1 rounded-md cursor-pointer">
                        <IoIosSave className="text-xl sm:text-2xl" />
                    </button>
                </div>

                {/* ================= Search Bar ================= */}
                <div className="bg-white border-b border-gray-300 shadow-md p-3 sm:p-4 md:p-6 flex justify-center">
                    <div className="flex w-full sm:w-[90%] md:w-[80%] border border-gray-400 rounded-md p-1 font-mono shadow-sm">
                        <input
                            type="text"
                            placeholder="Search data here..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSearch(searchQuery)}
                            className="flex-1 p-1 sm:p-2 outline-none px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm"
                        />

                        <button
                            onClick={() => onSearch(searchQuery)}
                            className="px-3 sm:px-5 py-1 sm:py-2 border-l border-gray-400 hover:bg-gray-100">
                            <BsSearch className="text-base sm:text-xl" />
                        </button>
                    </div>
                </div>

                {/* ================= Main ================= */}
                <div className="flex flex-1 overflow-hidden rounded-b-md flex-col sm:flex-row">

                    {/* -------- Sidebar -------- */}
                    {sidebarOpen && data.length > 0 && (
                        <aside className="w-full sm:w-64 bg-[#F8F9FB] border-r border-gray-300 p-2 sm:p-4 text-xs sm:text-sm overflow-y-auto order-2 sm:order-1">
                            <div className="flex justify-between items-center mb-2 sm:mb-3 border-b pb-2">
                                <h4 className="font-semibold text-gray-700 text-xs sm:text-sm">
                                    Selected Fields
                                </h4>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="text-xs text-gray-600 hover:text-gray-900"
                                >
                                    Hide
                                </button>
                            </div>

                            <ul className="space-y-1 sm:space-y-2 text-gray-700">
                                {Object.keys(data[0]).map((key) => (
                                    <li key={key} className="flex justify-between">
                                        <span className="text-xs sm:text-sm">{key}</span>
                                        <span className="text-gray-500 text-xs sm:text-sm">✓</span>
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    )}

                    {/* -------- Table -------- */}
                    <main className="flex-1 bg-white border-l border-gray-300 shadow-inner p-2 sm:p-4 md:p-6 overflow-y-auto order-1 sm:order-2">
                        {!sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="text-xs sm:text-sm mb-2 sm:mb-3 bg-gray-100 border px-2 sm:px-3 py-1 rounded-md"
                            >
                                Show Fields
                            </button>
                        )}

                        {loading ? (
                            <p className="text-center py-4 sm:py-6 text-gray-600 text-xs sm:text-sm">
                                Loading data...
                            </p>
                        ) : error ? (
                            <pre className="text-red-600 text-center font-medium p-3 sm:p-5 whitespace-pre-wrap break-all text-xs sm:text-sm">
                                {error}
                            </pre>
                        ) : data.length === 0 ? (
                            <p className="text-center py-4 sm:py-6 text-gray-500 text-xs sm:text-sm">
                                No data to display
                            </p>
                        ) : (
                            <>
                                <h3 className="font-semibold text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">
                                    Results ({data.length})
                                </h3>

                                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                    <table className="w-full text-xs sm:text-sm border-collapse">
                                        <thead className="bg-gray-200 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-1 sm:p-2 text-center w-6 sm:w-8 border-r text-xs sm:text-sm">#</th>
                                                {Object.keys(data[0]).map((key) => (
                                                    <th
                                                        key={key}
                                                        className="p-1 sm:p-2 text-left font-semibold capitalize border-r text-xs sm:text-sm"
                                                    >
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {paginatedData.map((row, i) => (
                                                <React.Fragment key={i}>
                                                    <tr
                                                        className={`${i % 2 === 0
                                                            ? "bg-white"
                                                            : "bg-gray-100"
                                                            } hover:bg-green-50 cursor-pointer`}
                                                        onClick={() => toggleRow(i)}
                                                    >
                                                        <td className="text-center border-r font-bold text-gray-500 text-xs sm:text-sm">
                                                            {expandedRows[i] ? "v" : ">"}
                                                        </td>

                                                        {Object.values(row).map((val, j) => (
                                                            <td
                                                                key={j}
                                                                className="p-1 sm:p-2 border-r text-gray-800 text-xs sm:text-sm break-all max-w-[100px] sm:max-w-none"
                                                            >
                                                                {String(formatPossibleDate(val))}
                                                            </td>
                                                        ))}
                                                    </tr>

                                                    {expandedRows[i] && (
                                                        <tr className="bg-gray-200">
                                                            <td
                                                                colSpan={
                                                                    Object.keys(row).length + 1
                                                                }
                                                                className="p-2 sm:p-3"
                                                            >
                                                                <pre className="text-[10px] sm:text-xs font-mono text-gray-700 break-all">
                                                                    {JSON.stringify(
                                                                        row,
                                                                        (_, value) => (typeof value === "bigint" ? value.toString() : value),
                                                                        2
                                                                    )}
                                                                </pre>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="flex justify-center mt-3 sm:mt-4 gap-1 sm:gap-2 text-xs sm:text-sm">
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) => Math.max(1, p - 1))
                                        }
                                        disabled={currentPage === 1}
                                        className="px-2 sm:px-3 py-1 border rounded disabled:opacity-50 text-xs sm:text-sm"
                                    >
                                        Prev
                                    </button>

                                    {Array.from(
                                        { length: totalPages },
                                        (_, i) => i + 1
                                    ).map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setCurrentPage(n)}
                                            className={`px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm ${currentPage === n
                                                ? "bg-green-600 text-white"
                                                : ""
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages, p + 1)
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        className="px-2 sm:px-3 py-1 border rounded disabled:opacity-50 text-xs sm:text-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SearchTable;
