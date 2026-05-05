import React, { useState, useEffect } from "react";

/**
 * Generic paginated table for moderate-to-large datasets.
 *
 * Props:
 *   columns          – Array<{ key, label, width?, cellClassName?, render? }>
 *   data             – Array of row objects
 *   loading          – boolean
 *   error            – string
 *   emptyText        – string
 *   rowKey           – (row, index) => string | number
 *   title            – string header label
 *   defaultRowsPerPage – number (default 20)
 */
const PerformantTable = ({
    columns,
    data,
    loading,
    error,
    emptyText,
    rowKey,
    title,
    defaultRowsPerPage = 20,
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

    useEffect(() => { setCurrentPage(1); }, [data]);

    const totalPages = Math.ceil(data.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + rowsPerPage);

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
                {data.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300">{data.length.toLocaleString()} items</span>
                        {totalPages > 1 && (
                            <span className="text-xs text-gray-400">• Page {currentPage} of {totalPages}</span>
                        )}
                    </div>
                )}
            </div>

            {/* States */}
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
                    {/* Controls bar */}
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Rows per page:</label>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                                {[10, 20, 50, 100].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >‹</button>
                                <span className="text-xs text-gray-600 px-2">{currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >›</button>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    {columns.map((col, i) => (
                                        <th key={i} className={`p-2 text-left text-xs font-semibold border-r border-gray-200 ${col.width || ""}`}>
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
                                            <td key={colIndex} className={`p-2 border-r border-gray-200 ${col.cellClassName || ""}`}>
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

export default PerformantTable;