import { Navigate, useLocation } from 'react-router-dom';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';

export default function TeamProtectedRoute({ children }) {
  const { member, loading } = useTeamAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return <Navigate to="/team/login" state={{ from: location }} replace />;
  }

  return children;
}
