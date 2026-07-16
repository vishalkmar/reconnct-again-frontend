import { Navigate, useLocation } from 'react-router-dom';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';

export default function SupplierProtectedRoute({ children }) {
  const { supplier, loading } = useSupplierAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!supplier) {
    return <Navigate to="/supplier/login" state={{ from: location }} replace />;
  }

  return children;
}
