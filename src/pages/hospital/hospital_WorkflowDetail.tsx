import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Paperclip,
  MessageSquare,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { hospitalApi } from "../../utils/api";
import WorkflowAttachments from "../../components/hospital/WorkflowAttachments";

interface WorkflowItem {
  _id: string;
  type: string;
  title: string;
  description?: string;
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
  assignedBy?: string;
  submittedBy: string;
  submittedAt?: string;
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
  location?: string;
  department?: string;
  data?: any;
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    uploadedAt: string;
    url: string;
  }>;
  comments?: Array<{
    author: string;
    text: string;
    createdAt: string;
    internal: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowTask {
  _id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  dueDate: string;
  completedAt?: string;
  priority: "low" | "medium" | "high" | "critical";
  completionNotes?: string;
  tags?: string[];
  location?: string;
  createdAt: string;
  updatedAt: string;
}

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

export default function Hospital_WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<WorkflowItem | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
  });

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        const res: any = await hospitalApi.getWorkflowItem(id);
        setItem(res);
        setTasks(res.tasks || []);
      } catch (e) {
        console.error("Failed to fetch workflow item", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const refetch = async () => {
    if (!id) return;
    const res: any = await hospitalApi.getWorkflowItem(id);
    setItem(res);
    setTasks(res.tasks || []);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !id) return;
    try {
      await hospitalApi.addWorkflowComment(id, {
        text: commentText,
        internal: commentInternal,
      });
      // Refetch to get new comment
      await refetch();
      setCommentText("");
      setCommentInternal(false);
    } catch (e) {
      console.error("Failed to add comment", e);
      alert("Failed to add comment");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await hospitalApi.updateWorkflowItem(id, { status: newStatus });
      await refetch();
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (
      !taskForm.title.trim() ||
      !taskForm.assignedTo.trim() ||
      !taskForm.dueDate
    ) {
      alert("Task title, assignee, and due date are required");
      return;
    }
    try {
      await hospitalApi.createWorkflowTask(id, {
        title: taskForm.title,
        description: taskForm.description || undefined,
        assignedTo: taskForm.assignedTo,
        dueDate: new Date(taskForm.dueDate).toISOString(),
        priority: taskForm.priority,
      });
      setTaskForm({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "medium",
      });
      setShowTaskForm(false);
      await refetch();
    } catch (e) {
      console.error("Failed to create task", e);
      alert("Failed to create task");
    }
  };

  const handleUpdateTaskStatus = async (
    taskId: string,
    status: WorkflowTask["status"],
  ) => {
    try {
      await hospitalApi.updateWorkflowTask(taskId, { status });
      await refetch();
    } catch (e) {
      console.error("Failed to update task", e);
      alert("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await hospitalApi.deleteWorkflowTask(taskId);
      await refetch();
    } catch (e) {
      console.error("Failed to delete task", e);
      alert("Failed to delete task");
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this item?")) return;
    try {
      await hospitalApi.deleteWorkflowItem(id);
      navigate("/hospital/workflow");
    } catch (e) {
      console.error("Failed to delete item", e);
      alert("Failed to delete item");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Item not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link
            to="/hospital/workflow"
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600">
                {typeLabels[item.type] || item.type}
              </span>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status]}`}
              >
                {item.status.replace("_", " ")}
              </span>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[item.priority]}`}
              >
                {item.priority}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/hospital/workflow/${item._id}/edit`}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {item.description && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}

          {/* Type-specific Data */}
          {item.data && Object.keys(item.data).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-3">Details</h2>
              <dl className="space-y-2">
                {Object.entries(item.data).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-600 capitalize">
                      {key.replace(/_/g, " ")}
                    </dt>
                    <dd className="col-span-2 text-gray-900">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Attachments */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <WorkflowAttachments
              workflowItemId={item._id}
              attachments={item.attachments || []}
              onAttachmentsChange={(attachments) => {
                setItem((prev) => ({ ...prev, attachments }));
              }}
            />
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
            {showTaskForm && (
              <form
                onSubmit={handleCreateTask}
                className="mb-4 p-4 border rounded bg-gray-50 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      value={taskForm.title}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned To *
                    </label>
                    <input
                      value={taskForm.assignedTo}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          assignedTo: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          priority: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-3 py-2 border rounded hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            )}
            {tasks.length === 0 ? (
              <p className="text-gray-600">No tasks assigned</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task._id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {task.assignedTo}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[task.status]}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                        <div className="mt-2 flex gap-2 justify-end">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleUpdateTaskStatus(
                                task._id,
                                e.target.value as any,
                              )
                            }
                            className="text-xs px-2 py-1 border rounded"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task._id)}
                            className="text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Task Attachments */}
                    <WorkflowAttachments
                      taskId={task._id}
                      attachments={task.attachments || []}
                      onAttachmentsChange={(attachments) => {
                        setTasks((prev) =>
                          prev.map((t) =>
                            t._id === task._id ? { ...t, attachments } : t,
                          ),
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Meta & Comments */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-600">
                  Submitted By
                </dt>
                <dd className="text-gray-900">{item.submittedBy}</dd>
              </div>
              {item.assignedTo && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    Assigned To
                  </dt>
                  <dd className="text-gray-900">{item.assignedTo}</dd>
                </div>
              )}
              {item.location && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    Location
                  </dt>
                  <dd className="text-gray-900">{item.location}</dd>
                </div>
              )}
              {item.department && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    Department
                  </dt>
                  <dd className="text-gray-900">{item.department}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-600">Created</dt>
                <dd className="text-gray-900">
                  {new Date(item.createdAt).toLocaleString()}
                </dd>
              </div>
              {item.dueDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    Due Date
                  </dt>
                  <dd
                    className={
                      new Date(item.dueDate) < new Date()
                        ? "text-red-600 font-medium"
                        : "text-gray-900"
                    }
                  >
                    {new Date(item.dueDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>

            {/* Status Actions */}
            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium text-gray-600">
                Change Status
              </label>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments
            </h2>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="mb-4 space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={commentInternal}
                    onChange={(e) => setCommentInternal(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Internal only</span>
                </label>
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Comment
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {item.comments && item.comments.length > 0 ? (
                item.comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded ${comment.internal ? "bg-yellow-50" : "bg-gray-50"}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">
                        {comment.author}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                    {comment.internal && (
                      <span className="inline-block mt-1 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        Internal
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-sm">No comments yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
