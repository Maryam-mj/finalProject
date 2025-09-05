import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBuddies: 0,
    pendingRequests: 0,
    projectsCompleted: 0
  });
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // FIX: Use correct API base URL
const API_BASE_URL = "http://127.0.0.1:5000/api/admin";

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated');
    const adminUser = localStorage.getItem('adminUser');
    
    if (!isAuthenticated || !adminUser) {
      navigate('/adminlogin');
      return;
    }
    let user;
    try {
      user = JSON.parse(adminUser);
    } catch (e) {
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminUser');
      navigate('/adminlogin');
      return;
    }
    if (!user || !user.is_admin) {
      navigate('/');
      return;
    }
    fetchDashboardData();
  }, [navigate, localStorage.getItem('adminUser')]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const config = {
        withCredentials: true
      };
      
      const statsResponse = await axios.get(`${API_BASE_URL}/stats`, config);
      setStats(statsResponse.data);
      // Defensive: handle empty or missing users array
      const usersResponse = await axios.get(`${API_BASE_URL}/users`, config);
      const formattedUsers = Array.isArray(usersResponse.data)
        ? usersResponse.data.map(user => ({
            id: user.id,
            name: user.username,
            email: user.email,
            role: user.is_admin ? 'Admin' : 'User',
            specialization: user.profile?.specialization || 'Not specified',
            status: user.is_active ? 'Active' : 'Inactive',
            avatar: user.profile?.profile_picture || `https://ui-avatars.com/api/?name=${user.username}&background=6366f1&color=fff`,
            createdAt: user.created_at,
            lastLogin: user.last_login
          }))
        : [];
      setUsers(formattedUsers);
      // Defensive: handle empty or missing requests array
      const requestsResponse = await axios.get(`${API_BASE_URL}/requests`, config);
      const formattedRequests = Array.isArray(requestsResponse.data)
        ? requestsResponse.data.map(request => ({
            id: request.id,
            from: request.initiator?.username || `User ${request.user_id}`,
            fromId: request.user_id,
            to: request.buddy_user?.username || `User ${request.buddy_id}`,
            toId: request.buddy_id,
            date: new Date(request.created_at).toLocaleDateString(),
            status: request.status
          }))
        : [];
      setRequests(formattedRequests);
      setLoading(false);
    } catch (err) {
      console.error("Database connection error:", err);
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminUser');
        navigate('/adminlogin');
      } else if (err.response && err.response.status === 403) {
        setError("You don't have permission to access the admin dashboard.");
        navigate('/');
      } else {
        setError("Failed to fetch dashboard data. Please check your connection.");
      }
      setLoading(false);
    }
  };

  // ...existing code for handleLogout, handleDeleteUser, handleToggleUserStatus, handleApproveRequest, handleRejectRequest, StatCard, UserRow, Sidebar, and rendering...

  // (The rest of your component remains unchanged)



  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminUser');
    navigate('/adminlogin');
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const config = {
          withCredentials: true
        };
        
        await axios.delete(`${API_BASE_URL}/users/${userId}`, config);
        setUsers(users.filter(user => user.id !== userId));
        setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
      } catch (err) {
        setError("Failed to delete user.");
        console.error(err);
      }
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const config = {
        withCredentials: true
      };
      
      const newStatus = currentStatus === 'Active' ? 'inactive' : 'active';
      await axios.put(`${API_BASE_URL}/users/${userId}/status`, { status: newStatus }, config);
      
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, status: newStatus === 'active' ? 'Active' : 'Inactive' } 
          : user
      ));
    } catch (err) {
      setError("Failed to update user status.");
      console.error(err);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const config = {
        withCredentials: true
      };
      
      await axios.post(`${API_BASE_URL}/approve-request/${requestId}`, {}, config);
      
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: 'approved' } 
          : request
      ));
      
      setStats(prev => ({ 
        ...prev, 
        pendingRequests: prev.pendingRequests - 1,
        activeBuddies: prev.activeBuddies + 1
      }));
    } catch (err) {
      setError("Failed to approve request.");
      console.error(err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const config = {
        withCredentials: true
      };
      
      await axios.post(`${API_BASE_URL}/reject-request/${requestId}`, {}, config);
      
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: 'rejected' } 
          : request
      ));
      
      setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
    } catch (err) {
      setError("Failed to reject request.");
      console.error(err);
    }
  };

  const StatCard = ({ title, value, icon, color = "red" }) => (
    <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${color === "red" ? "bg-red-100" : color === "green" ? "bg-green-100" : color === "yellow" ? "bg-yellow-100" : "bg-blue-100"}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const UserRow = ({ user, onDelete, onToggleStatus }) => (
    <tr className="hover:bg-gray-50 transition-colors duration-200">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt={user.name} />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {user.role}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {user.specialization}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
          ${user.status === 'Active' 
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
          }`}>
          {user.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button 
          onClick={() => onToggleStatus(user.id, user.status)}
          className={`mr-3 ${
            user.status === 'Active' 
              ? 'text-yellow-600 hover:text-yellow-900' 
              : 'text-green-600 hover:text-green-900'
          }`}
        >
          {user.status === 'Active' ? 'Deactivate' : 'Activate'}
        </button>
        <button 
          onClick={() => onDelete(user.id)}
          className="text-red-600 hover:text-red-900"
        >
          Delete
        </button>
      </td>
    </tr>
  );

  const Sidebar = () => (
    <div className="w-64 p-6 flex flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-600">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
      </div>
          
      <nav className="space-y-2 flex-1">
        {[
          { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
          { id: 'users', label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
          { id: 'requests', label: 'Connection Requests', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
          { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left
              ${activeTab === item.id 
                ? 'bg-red-50 text-red-600' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="pt-6 mt-6 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <Sidebar />
        
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-gray-600">Manage users, connections, and platform analytics</p>
                </div>
                <div className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>
              
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 border border-red-200">
                  {error}
                  <button 
                    onClick={() => setError(null)} 
                    className="float-right text-red-800 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
              
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Users"
                      value={stats.totalUsers}
                      icon={<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>}
                    />
                    <StatCard
                      title="Active Buddies"
                      value={stats.activeBuddies}
                      icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>}
                      color="green"
                    />
                    <StatCard
                      title="Pending Requests"
                      value={stats.pendingRequests}
                      icon={<svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>}
                      color="yellow"
                    />
                    <StatCard
                      title="Projects Completed"
                      value={stats.projectsCompleted}
                      icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>}
                      color="blue"
                    />
                  </div>
                  
                  <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Add New User', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
                        { label: 'Review Requests', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                        { label: 'Generate Report', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                        { label: 'System Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
                      ].map((action, index) => (
                        <button
                          key={index}
                          className="p-4 rounded-lg text-center transition-all duration-200 bg-gray-50 hover:bg-gray-100 text-gray-900"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 bg-red-100 text-red-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                            </svg>
                          </div>
                          <span className="font-medium">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900">Recent Activity</h2>
                    <div className="space-y-4">
                      {requests.slice(0, 5).map((request, index) => (
                        <div key={index} className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3
                            ${request.status === 'approved' ? 'bg-green-100 text-green-600' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              'bg-yellow-100 text-yellow-600'}`}>
                            {request.status === 'approved' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : request.status === 'rejected' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              <span className="capitalize">{request.from}</span> sent a connection request to <span className="text-red-600">{request.to}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Status: <span className={
                                request.status === 'approved' ? 'text-green-600' :
                                request.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                              }>{request.status}</span> • {request.date}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'users' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                      <p className="text-sm text-gray-600">Manage all registered users and their permissions</p>
                    </div>
                    <button 
                      onClick={fetchDashboardData}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Refresh Data
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                          <UserRow 
                            key={user.id} 
                            user={user} 
                            onDelete={handleDeleteUser}
                            onToggleStatus={handleToggleUserStatus}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {activeTab === 'requests' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Connection Requests</h2>
                      <p className="text-sm text-gray-600">Review and manage pending connection requests</p>
                    </div>
                    <button 
                      onClick={fetchDashboardData}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Refresh Requests
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {requests.length > 0 ? (
                          requests.map(request => (
                            <tr key={request.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900">{request.from}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{request.to}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{request.date}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 inline-flex text-xs font-semibold rounded-full
                                  ${request.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : request.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {request.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-medium">
                                {request.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApproveRequest(request.id)}
                                      className="text-green-600 hover:text-green-900 mr-3"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectRequest(request.id)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                              No connection requests found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h2>
                  <p className="text-gray-600">Charts and graphs will be displayed here.</p>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h2>
                  <p className="text-gray-600">Configure platform settings here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;