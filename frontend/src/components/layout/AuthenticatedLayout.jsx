import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
