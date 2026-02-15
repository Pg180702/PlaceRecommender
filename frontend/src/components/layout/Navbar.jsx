import { Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { MapPin } from 'lucide-react';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/explore', label: 'Explore Places' },
  { to: '/preferences', label: 'Preferences' },
  { to: '/enjoyed', label: 'Enjoyed Restaurants' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <MapPin className="size-6 text-blue-600" />
            <Link to="/dashboard" className="text-xl font-semibold text-gray-900">
              PlaceMatch
            </Link>
          </div>

          <div className="flex items-center gap-6">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
