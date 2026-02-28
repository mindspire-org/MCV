import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { hospitalApi } from "../../utils/api";

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

const typeFields: Record<string, string[]> = {
  complaint: ["complainant", "contact", "nature", "description"],
  incident: ["location", "severity", "type", "description", "affected"],
  capa: ["source", "description", "action", "responsibility", "deadline"],
  housekeeping: ["area", "task", "frequency", "assigned_to"],
  utility: ["utility_type", "check_type", "reading", "status", "notes"],
  security: ["area", "issue_type", "description", "action_taken"],
  fleet: ["vehicle", "issue_type", "description", "priority"],
  surgery_safety: ["ot", "procedure", "issue", "severity", "action"],
  charity: [
    "patient_name",
    "mrn",
    "reason",
    "amount_requested",
    "justification",
  ],
  counselling: ["patient_name", "mrn", "counselling_type", "notes"],
  expiry_compliance: ["item", "batch", "expiry_date", "action"],
  document_policy: ["document_type", "title", "version", "description"],
  mortality_morbidity: [
    "patient_name",
    "mrn",
    "case_type",
    "findings",
    "action",
  ],
  biomedical_consumables: [
    "consumable",
    "procedure",
    "quantity",
    "cost",
    "date_used",
  ],
};

export default function Hospital_WorkflowNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState({
    type: searchParams.get("type") || "",
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    status: "submitted" as
      | "submitted"
      | "in_review"
      | "in_progress"
      | "completed"
      | "closed",
    assignedTo: "",
    dueDate: "",
    tags: "",
    location: "",
    department: "",
    data: {} as Record<string, any>,
  });

  const selectedTypeFields = typeFields[formData.type] || [];

  // Auto-set today's date and default status for operations modules
  useEffect(() => {
    if (
      !isEdit &&
      (formData.type === "housekeeping" ||
        formData.type === "utility" ||
        formData.type === "security")
    ) {
      const today = new Date().toISOString().slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        dueDate: today,
        status: "completed", // Daily logs are typically completed when logged
      }));
    }
  }, [formData.type, isEdit]);

  useEffect(() => {
    // Initialize data fields for the selected type (preserve existing values)
    const initialData: Record<string, any> = { ...(formData.data || {}) };
    selectedTypeFields.forEach((field) => {
      if (initialData[field] == null) initialData[field] = "";
    });
    Object.keys(initialData).forEach((k) => {
      if (!selectedTypeFields.includes(k)) delete initialData[k];
    });
    setFormData((prev) => ({ ...prev, data: initialData }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoadingItem(true);
      try {
        const item: any = await hospitalApi.getWorkflowItem(id);
        setFormData((prev) => ({
          ...prev,
          type: item.type || "",
          title: item.title || "",
          description: item.description || "",
          priority: item.priority || "medium",
          status: item.status || "submitted",
          assignedTo: item.assignedTo || "",
          dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : "",
          tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
          location: item.location || "",
          department: item.department || "",
          data: item.data && typeof item.data === "object" ? item.data : {},
        }));
      } catch (e) {
        console.error("Failed to load workflow item", e);
        alert("Failed to load item");
        navigate("/hospital/workflow");
      } finally {
        setLoadingItem(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : undefined,
      };
      if (isEdit && id) {
        await hospitalApi.updateWorkflowItem(id, payload);
        navigate(`/hospital/workflow/${id}`);
      } else {
        await hospitalApi.createWorkflowItem(payload);
        navigate("/hospital/workflow");
      }
    } catch (e) {
      console.error("Failed to save workflow item", e);
      alert("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDataChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/hospital/workflow")}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit Compliance Item" : "New Compliance Item"}
          </h1>
        </div>
      </div>

      {loadingItem ? (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                  required
                  disabled={isEdit}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a type...</option>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    handleInputChange("priority", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="submitted">Submitted</option>
                  <option value="in_review">In Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={4}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) =>
                    handleInputChange("assignedTo", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                  placeholder="e.g. urgent, safety, maintenance"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Type-specific Fields */}
          {formData.type && selectedTypeFields.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">
                {typeLabels[formData.type]} Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTypeFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {field.replace(/_/g, " ")}
                    </label>
                    <input
                      type="text"
                      value={formData.data[field] || ""}
                      onChange={(e) => handleDataChange(field, e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/hospital/workflow")}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.type || !formData.title}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
