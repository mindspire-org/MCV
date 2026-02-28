import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Hospital_WorkflowDashboard from "../hospital_WorkflowDashboard";
import { hospitalApi } from "../../../utils/api";

type OperationsStats = {
  byType: Record<string, Record<string, number>>;
  todayByType: Record<string, number>;
  weekByType: Record<string, number>;
  overdueTasksAll: number;
};

export default function Hospital_OpsDashboard() {
  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res: any = await hospitalApi.getWorkflowOperationsStats();
        setStats(res);
      } catch (e) {
        console.error("Failed to load Operations stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const cards = useMemo(() => {
    const get = (type: string, status: string) =>
      stats?.byType?.[type]?.[status] || 0;
    
    const getToday = (type: string) => stats?.todayByType?.[type] || 0;
    const getWeek = (type: string) => stats?.weekByType?.[type] || 0;

    const baseCards = [
      {
        label: "Housekeeping",
        getOverall: () => get("housekeeping", "submitted") + get("housekeeping", "in_review") + get("housekeeping", "in_progress"),
        getToday: () => getToday("housekeeping"),
        getWeek: () => getWeek("housekeeping"),
        color: "bg-blue-50 border-blue-200 text-blue-900",
        link: "/hospital/ops/housekeeping",
      },
      {
        label: "Utilities",
        getOverall: () => get("utility", "submitted") + get("utility", "in_review") + get("utility", "in_progress"),
        getToday: () => getToday("utility"),
        getWeek: () => getWeek("utility"),
        color: "bg-orange-50 border-orange-200 text-orange-900",
        link: "/hospital/ops/utilities",
      },
      {
        label: "Security & Safety",
        getOverall: () => get("security", "submitted") + get("security", "in_review") + get("security", "in_progress"),
        getToday: () => getToday("security"),
        getWeek: () => getWeek("security"),
        color: "bg-green-50 border-green-200 text-green-900",
        link: "/hospital/ops/security",
      },
    ];

    return baseCards.map(card => ({
      ...card,
      value: filter === "today" ? card.getToday() : filter === "week" ? card.getWeek() : card.getOverall(),
      subtitle: filter === "today" ? "Today" : filter === "week" ? "This Week" : "Open Items",
    }));
  }, [stats, filter]);

  return (
    <div>
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Operations</h1>
            <p className="text-sm text-gray-600 mt-1">
              Daily logs for housekeeping, utilities, and security & safety
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/hospital/workflow/new?type=housekeeping"
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Housekeeping Log
            </Link>
            <Link
              to="/hospital/workflow/new?type=utility"
              className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Utility Log
            </Link>
            <Link
              to="/hospital/workflow/new?type=security"
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Security Log
            </Link>
          </div>
        </div>

        <div className="mt-4">
          {/* Quick Filters */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === "all"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Open Items
            </button>
            <button
              onClick={() => setFilter("today")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === "today"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter("week")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === "week"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Week
            </button>
          </div>

          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-100 animate-pulse rounded border"
                />
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {cards.map((c) => (
                  <Link
                    key={c.label}
                    to={c.link}
                    className={`block rounded border p-4 ${c.color} hover:opacity-90 transition-opacity`}
                  >
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-2xl font-bold mt-1">{c.value}</div>
                    <div className="text-xs mt-1 opacity-75">{c.subtitle}</div>
                  </Link>
                ))}
              </div>

              {stats.overdueTasksAll > 0 && (
                <div className="rounded border border-red-200 bg-red-50 p-4 text-red-900">
                  <div className="font-semibold">Overdue tasks</div>
                  <div className="text-sm mt-1">
                    Operations overdue tasks:{" "}
                    <span className="font-semibold">
                      {stats.overdueTasksAll}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Stats unavailable</div>
          )}
        </div>
      </div>

      <Hospital_WorkflowDashboard />
    </div>
  );
}
