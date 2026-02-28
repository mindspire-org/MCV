import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Hospital_WorkflowDashboard from "../hospital_WorkflowDashboard";
import { hospitalApi } from "../../../utils/api";

type CqiStats = {
  byType: Record<string, Record<string, number>>;
  overdueTasksAll: number;
  overdueTasksCapa: number;
};

export default function Hospital_CqiDashboard() {
  const [stats, setStats] = useState<CqiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res: any = await hospitalApi.getWorkflowCqiStats();
        setStats(res);
      } catch (e) {
        console.error("Failed to load CQI stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const cards = useMemo(() => {
    const get = (type: string, status: string) =>
      stats?.byType?.[type]?.[status] || 0;
    return [
      {
        label: "Complaints (Open)",
        value:
          get("complaint", "submitted") +
          get("complaint", "in_review") +
          get("complaint", "in_progress"),
        color: "bg-blue-50 border-blue-200 text-blue-900",
      },
      {
        label: "Incidents (Open)",
        value:
          get("incident", "submitted") +
          get("incident", "in_review") +
          get("incident", "in_progress"),
        color: "bg-orange-50 border-orange-200 text-orange-900",
      },
      {
        label: "CAPA (Open)",
        value:
          get("capa", "submitted") +
          get("capa", "in_review") +
          get("capa", "in_progress"),
        color: "bg-green-50 border-green-200 text-green-900",
      },
      {
        label: "Closed (All)",
        value:
          get("complaint", "closed") +
          get("incident", "closed") +
          get("capa", "closed"),
        color: "bg-gray-50 border-gray-200 text-gray-900",
      },
    ];
  }, [stats]);

  return (
    <div>
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Communication & CQI</h1>
            <p className="text-sm text-gray-600 mt-1">
              Complaints, incidents and CAPA tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/hospital/workflow/new?type=complaint"
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              New Complaint
            </Link>
            <Link
              to="/hospital/workflow/new?type=incident"
              className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              New Incident
            </Link>
            <Link
              to="/hospital/workflow/new?type=capa"
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              New CAPA
            </Link>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-100 animate-pulse rounded border"
                />
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((c) => (
                  <div
                    key={c.label}
                    className={`rounded border p-4 ${c.color}`}
                  >
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-2xl font-bold mt-1">{c.value}</div>
                  </div>
                ))}
              </div>

              {(stats.overdueTasksAll > 0 || stats.overdueTasksCapa > 0) && (
                <div className="rounded border border-red-200 bg-red-50 p-4 text-red-900">
                  <div className="font-semibold">Overdue tasks</div>
                  <div className="text-sm mt-1">
                    All overdue tasks:{" "}
                    <span className="font-semibold">
                      {stats.overdueTasksAll}
                    </span>
                  </div>
                  <div className="text-sm">
                    Overdue CAPA tasks:{" "}
                    <span className="font-semibold">
                      {stats.overdueTasksCapa}
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
