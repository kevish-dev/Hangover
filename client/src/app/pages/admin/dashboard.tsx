import { Navigate } from "react-router";

export default function AdminDashboardRedirect() {
  return <Navigate to="/dashboard/trips" replace />;
}
