import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import CustomerDetail from '@/components/admin/CustomerDetail';

export default function AdminCustomerDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">Invalid customer ID</div>
          <div className="text-sm text-gray-500">Please provide a valid customer ID</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <CustomerDetail customerId={id} />
    </AdminLayout>
  );
}
