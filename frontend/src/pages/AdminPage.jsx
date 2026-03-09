import Dashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';

function AdminPage() {
  return (
    <div className="space-y-8">
      <Dashboard />
      <UserManagement />
    </div>
  );
}

export default AdminPage;
