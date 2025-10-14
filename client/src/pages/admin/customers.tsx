import AdminLayout from '@/components/admin/AdminLayout';
import CustomerList from '@/components/admin/CustomerList';

export default function AdminCustomersPage() {
  return (
    <AdminLayout>
      <CustomerList />
    </AdminLayout>
  );
}
