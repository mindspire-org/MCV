import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import { hospitalApi } from "../../utils/api";

interface DashboardSummary {
  total: number;
  draft: number;
  submitted: number;
  inReview: number;
  approved: number;
  rejected: number;
  inProgress: number;
  closed: number;
  overdueTasks: number;
}

export default function Hospital_WorkflowDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res: any = await hospitalApi.getWorkflowDashboardSummary();
        setSummary(res);
      } catch (e) {
        console.error("Failed to fetch dashboard summary", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading || !summary) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Total",
      value: summary.total,
      icon: LayoutDashboard,
      color: "bg-blue-500",
    },
    { label: "Draft", value: summary.draft, icon: Clock, color: "bg-gray-500" },
    {
      label: "Submitted",
      value: summary.submitted,
      icon: Users,
      color: "bg-yellow-500",
    },
    {
      label: "In Review",
      value: summary.inReview,
      icon: AlertTriangle,
      color: "bg-orange-500",
    },
    {
      label: "Approved",
      value: summary.approved,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      label: "Rejected",
      value: summary.rejected,
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    {
      label: "In Progress",
      value: summary.inProgress,
      icon: TrendingUp,
      color: "bg-indigo-500",
    },
    {
      label: "Closed",
      value: summary.closed,
      icon: CheckCircle,
      color: "bg-gray-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Compliance & Operations Dashboard
        </h1>
        <Link
          to="/hospital/workflow/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          New Item
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-lg shadow p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <div className={`p-2 rounded-full text-white ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overdue Tasks Alert */}
      {summary.overdueTasks > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">
              {summary.overdueTasks} overdue task
              {summary.overdueTasks > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            Please review and update overdue tasks to maintain compliance.
          </p>
          <Link
            to="/hospital/workflow?status=pending&overdue=true"
            className="inline-block mt-2 text-sm text-red-700 underline hover:no-underline"
          >
            View overdue tasks
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/hospital/workflow?type=complaint"
            className="block p-4 border rounded hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">Complaint Management</h3>
            <p className="text-sm text-gray-600">
              Log and track patient/staff complaints
            </p>
          </Link>
          <Link
            to="/hospital/workflow?type=incident"
            className="block p-4 border rounded hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">Incident Reporting</h3>
            <p className="text-sm text-gray-600">
              Report safety and operational incidents
            </p>
          </Link>
          <Link
            to="/hospital/workflow?type=capa"
            className="block p-4 border rounded hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">CAPA</h3>
            <p className="text-sm text-gray-600">
              Corrective and preventive actions
            </p>
          </Link>
          <Link
            to="/hospital/workflow?type=housekeeping"
            className="block p-4 border rounded hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">Housekeeping</h3>
            <p className="text-sm text-gray-600">Cleaning schedules and logs</p>
          </Link>
          <Link
            to="/hospital/workflow?type=utility"
            className="block p-4 border rounded hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">Utilities</h3>
            <p className="text-sm text-gray-600">
              Daily utility checks and logs
            </p>
          </Link>
          <Link
            to="/hospital/workflow?type=security"
            className="block p-4 border rounded hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">Security & Safety</h3>
            <p className="text-sm text-gray-600">
              Security rounds and safety inspections
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
