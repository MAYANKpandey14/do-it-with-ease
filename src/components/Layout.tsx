
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Clock, 
  BarChart3, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const { toast } = useToast();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Timer', href: '/timer', icon: Clock },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign out.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex items-center px-6 py-4 border-b">
          <div className="text-xl font-bold text-gray-800">FocusFlow</div>
        </div>
        
        <nav className="mt-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-6 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                {profile?.full_name 
                  ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : <User className="h-4 w-4" />
                }
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
