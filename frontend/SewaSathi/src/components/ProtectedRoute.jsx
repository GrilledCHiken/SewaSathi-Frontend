import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, role }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return null;
  }

  const authorized = Boolean(user) && (!role || user.role === role);

  if (!authorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
