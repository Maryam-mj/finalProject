import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading, authChecked } = useAuth();
  
  if (loading || !authChecked) {
    return <div>Loading...</div>;
  }
  
  return user && isAdmin() ? children : <Navigate to="/adminlogin" replace />;
};

export default AdminRoute;