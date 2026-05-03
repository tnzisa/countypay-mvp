import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search
} from 'lucide-react';
import { Card, Badge, Button, Input } from './Common/UI';

/**
 * Professional Data Table Component
 * Sortable, searchable, paginated table
 */
export const DataTable = ({
  columns,
  data = [],
  loading = false,
  pageSize = 10,
  onRowClick,
  selectable = false,
  actions
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Filter data
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    return columns.some((col) => {
      const value = row[col.key];
      return (
        value &&
        value
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    });
  });

  // Sort data
  let sortedData = [...filteredData];
  if (sortColumn) {
    sortedData.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageData = sortedData.slice(startIdx, endIdx);

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const toggleRowSelection = (idx) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === pageData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pageData.map((_, idx) => idx)));
    }
  };

  return (
    <Card>
      {/* Search Bar */}
      {columns.some((col) => col.searchable !== false) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <Input
            placeholder="Search table..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            icon={Search}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === pageData.length}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`
                    px-6 py-3 text-left text-sm font-semibold text-gray-700
                    ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable !== false && sortColumn === col.key && (
                      <>
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No data found
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    border-b border-gray-200 hover:bg-gray-50 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${selectedRows.has(idx) ? 'bg-blue-50' : ''}
                  `}
                >
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleRowSelection(idx)}
                        className="w-4 h-4 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 text-sm text-gray-900"
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {startIdx + 1} to {Math.min(endIdx, sortedData.length)} of{' '}
          {sortedData.length} results
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`
                    px-3 py-1 rounded text-sm font-medium
                    ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
};

/**
 * Transaction History Table
 * Pre-configured for transaction display
 */
export const TransactionTable = ({ transactions, loading = false }) => {
  const columns = [
    {
      key: 'transactionRef',
      label: 'Reference',
      sortable: true
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (date) => new Date(date).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'fee',
      label: 'Fee Name',
      render: (fee) => fee?.name || '-'
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (amount) => `KES ${amount?.toLocaleString() || 0}`,
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => {
        const variants = {
          COMPLETED: 'success',
          PROCESSING: 'warning',
          PENDING: 'warning',
          FAILED: 'danger'
        };
        return (
          <Badge variant={variants[status] || 'default'}>{status}</Badge>
        );
      }
    },
    {
      key: 'paymentProvider',
      label: 'Provider',
      render: (provider) =>
        provider?.charAt(0).toUpperCase() +
        provider?.slice(1).toLowerCase()
    }
  ];

  const handleRowClick = (row) => {
    console.log('Transaction clicked:', row);
    // Navigate to transaction details
  };

  const actions = (row) => [
    <Button key="view" variant="ghost" size="sm">
      View
    </Button>,
    row.status === 'FAILED' && (
      <Button key="retry" variant="warning" size="sm">
        Retry
      </Button>
    )
  ];

  return (
    <DataTable
      columns={columns}
      data={transactions}
      loading={loading}
      pageSize={15}
      onRowClick={handleRowClick}
      actions={actions}
    />
  );
};

/**
 * County Performance Table
 * Pre-configured for county metrics
 */
export const CountyTable = ({ counties, loading = false }) => {
  const columns = [
    {
      key: 'name',
      label: 'County',
      sortable: true
    },
    {
      key: 'code',
      label: 'Code',
      render: (code) => <Badge>{code}</Badge>
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (revenue) => `KES ${revenue?.toLocaleString() || 0}`,
      sortable: true
    },
    {
      key: 'transactionCount',
      label: 'Transactions',
      sortable: true
    },
    {
      key: 'successRate',
      label: 'Success Rate',
      render: (rate) => (
        <Badge variant={rate > 95 ? 'success' : 'warning'}>
          {rate}%
        </Badge>
      ),
      sortable: true
    },
    {
      key: 'trend',
      label: 'Trend',
      render: (trend) => (trend === 'up' ? '📈' : '📉')
    },
    {
      key: 'growth',
      label: 'Growth',
      render: (growth) => (
        <span className={growth > 0 ? 'text-green-600' : 'text-red-600'}>
          {growth > 0 ? '+' : ''}{growth}%
        </span>
      ),
      sortable: true
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={counties}
      loading={loading}
      pageSize={20}
    />
  );
};
