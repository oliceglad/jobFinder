import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function RoleRoute({ roles, children }) {
  const user = useSelector((state) => state.auth.user);
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
