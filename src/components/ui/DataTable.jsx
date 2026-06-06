import React, { useState, useEffect } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

const DataTable = ({
  columns,
  data,
  searchTerm = "",
  onSearchChange = () => {},
  className = "",
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const requestSort = (key) => {
    setSortConfig(prev =>
      prev.key === key && prev.direction === "asc"
        ? { key, direction: "desc" }
        : { key, direction: "asc" }
    );
  };

  const processedData = React.useMemo(() => {
    let filtered = Array.isArray(data) ? data : [];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        columns.some(col => {
          const v = item[col.accessor];
          return v && v.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const av = a[sortConfig.key];
        const bv = b[sortConfig.key];
        if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
        if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, sortConfig, searchTerm, columns]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = Array.isArray(processedData)
    ? processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-900">
          <tr>
            {columns.map(column => (
              <th
                key={column.accessor}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort(column.accessor)}
              >
                <div className="flex items-center">
                  {column.header}
                  {sortConfig.key === column.accessor && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc"
                        ? <ChevronUpIcon className="h-4 w-4" />
                        : <ChevronDownIcon className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
          {paginatedData.length > 0 ? (
            paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                {columns.map(column => (
                  <td
                    key={`${rowIndex}-${column.accessor}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300"
                  >
                    {column.cell ? column.cell(row) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-10 text-center text-sm text-gray-400 dark:text-slate-500"
              >
                {Array.isArray(data) && data.length === 0
                  ? "No data available"
                  : "No matching records found"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, processedData.length)}
            </span>{" "}
            of <span className="font-medium">{processedData.length}</span> results
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
