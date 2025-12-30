import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

const DataPage = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [columnWidths, setColumnWidths] = useState({});
    const resizingRef = useRef(null);

    useEffect(() => {
        fetchTables();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            fetchTableData(selectedTable);
            setColumnWidths({}); // Reset widths on table change
        }
    }, [selectedTable]);

    const fetchTables = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/data/tables');
            if (!response.ok) {
                throw new Error('Failed to fetch tables');
            }
            const data = await response.json();
            setTables(data.tables);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchTableData = async (tableName) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:3000/api/data/tables/${tableName}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch data for ${tableName}`);
            }
            const data = await response.json();
            setTableData(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMouseMove = useCallback((e) => {
        if (!resizingRef.current) return;
        const { column, startX, startWidth } = resizingRef.current;
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Minimum width 50px
        setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
    }, []);

    const handleMouseUp = useCallback(() => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    }, [handleMouseMove]);

    const startResize = (e, column) => {
        e.preventDefault();
        const startWidth = columnWidths[column] || 200; // Default width
        resizingRef.current = { column, startX: e.clientX, startWidth };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-md overflow-y-auto flex-shrink-0">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Database Tables</h2>
                </div>
                <ul>
                    {tables.map((table) => (
                        <li key={table}>
                            <button
                                onClick={() => setSelectedTable(table)}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${selectedTable === table ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'
                                    }`}
                            >
                                {table}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-4 bg-white shadow-sm border-b flex justify-between items-center flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {selectedTable ? `Table: ${selectedTable}` : 'Select a table'}
                    </h1>
                    <Link to="/" className="text-blue-500 hover:underline">
                        Back to Home
                    </Link>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading data...</div>
                    ) : selectedTable && tableData.length > 0 ? (
                        <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full">
                            <div className="overflow-auto flex-1">
                                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            {Object.keys(tableData[0]).map((key) => (
                                                <th
                                                    key={key}
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group select-none"
                                                    style={{ width: columnWidths[key] || 200, minWidth: 50 }}
                                                >
                                                    <div className="truncate">{key}</div>
                                                    <div
                                                        onMouseDown={(e) => startResize(e, key)}
                                                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-gray-300 z-20"
                                                    />
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {tableData.map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                {Object.entries(row).map(([key, value], i) => (
                                                    <td
                                                        key={i}
                                                        className="px-6 py-4 text-sm text-gray-500 border-b border-gray-100"
                                                        style={{
                                                            width: columnWidths[key] || 200,
                                                            minWidth: 50,
                                                            maxWidth: columnWidths[key] || 200
                                                        }}
                                                    >
                                                        <div className="truncate" title={typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}>
                                                            {typeof value === 'object' && value !== null
                                                                ? JSON.stringify(value)
                                                                : String(value)}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : selectedTable ? (
                        <div className="text-center py-8 text-gray-500">No data found in this table.</div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Please select a table from the sidebar to view its data.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataPage;
