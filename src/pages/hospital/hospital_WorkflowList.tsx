import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Eye, Edit, Trash2, AlertTriangle } from "lucide-react";
import { hospitalApi } from "../../utils/api";

interface WorkflowItem {
  _id: string;
  type: string;
  title: string;
  status:
    | "draft"
    | "submitted"
    | "in_review"
    | "approved"
    | "rejected"
    | "in_progress"
    | "closed";
  priority: "low" | "medium" | "high" | "critical";
  assignedTo?: string;
  submittedBy: string;
  submittedAt?: string;
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
  location?: string;
  department?: string;
  createdAt: string;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  closed: "bg-gray-100 text-gray-600",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const typeLabels: Record<string, string> = {
  complaint: "Complaint",
  incident: "Incident",
  capa: "CAPA",
  housekeeping: "Housekeeping",
  utility: "Utilities",
  security: "Security & Safety",
  fleet: "Fleet",
  surgery_safety: "Surgery Safety",
  charity: "Charity Care",
  counselling: "Counselling",
  expiry_compliance: "Expiry Compliance",
  document_policy: "Document/Policy",
  mortality_morbidity: "M&M Review",
  biomedical_consumables: "Biomedical Consumables",
};

export default function Hospital_WorkflowList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
    priority: "",
    assignedTo: "",
    from: "",
    to: "",
  });

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });
      const res: any = await hospitalApi.listWorkflowItems(params);
      setItems(res.items || []);
      setPagination(
        res.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
      );
    } catch (e) {
      console.error("Failed to fetch workflow items", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    setFilters((prev) => ({ ...prev, ...params }));
  }, [searchParams]);

  useEffect(() => {
    fetchItems(1);
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    const newParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newParams.set(k, v);
    });
    setSearchParams(newParams);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await hospitalApi.deleteWorkflowItem(id);
      fetchItems(pagination.page);
    } catch (e) {
      console.error("Failed to delete item", e);
      alert("Failed to delete item");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Compliance & Operations</h1>
        <Link
          to="/hospital/workflow/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange("from", e.target.value)}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange("to", e.target.value)}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">
                        {typeLabels[item.type] || item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.title}
                        </p>
                        {item.location && (
                          <p className="text-xs text-gray-500">
                            {item.location}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status]}`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[item.priority]}`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.assignedTo || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.dueDate ? (
                        <span
                          className={
                            new Date(item.dueDate) < new Date()
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/hospital/workflow/${item._id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/hospital/workflow/${item._id}/edit`}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => fetchItems(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
            className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() =>
              fetchItems(Math.min(pagination.pages, pagination.page + 1))
            }
            disabled={pagination.page === pagination.pages}
            className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
