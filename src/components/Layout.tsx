
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogoutConfirmDialog } from '@/components/LogoutConfirmDialog';
import { MobileNavigation } from '@/components/MobileNavigation';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Clock, 
  BarChart3, 
  Settings, 
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getFocusRing } from '@/lib/theme';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const { toast } = useToast();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Timer', href: '/timer', icon: Clock },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return null;
    
    if (profile.avatar_url.startsWith('http')) {
      return profile.avatar_url;
    }
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(profile.avatar_url);
    
    return data.publicUrl;
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
      setShowLogoutDialog(false);
      navigate('/login');
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign out.',
        variant: 'destructive',
      });
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || profile?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-background flex w-full">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-64 bg-card shadow-lg flex flex-col border-r">
            <div className="flex items-center px-6 py-4 border-b">
              <div className="text-xl font-bold text-foreground">FocusFlow</div>
            </div>
            
            <nav className="mt-6 flex-1 overflow-y-auto relative" role="navigation" aria-label="Main navigation">
              {/* Active indicator background */}
              <div 
                className="absolute left-0 w-1 bg-primary transition-all duration-300 ease-in-out rounded-r-full"
                style={{
                  height: '48px',
                  top: `${navigation.findIndex(item => item.href === location.pathname) * 48 + 24}px`,
                  opacity: navigation.some(item => item.href === location.pathname) ? 1 : 0
                }}
              />
              
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center px-6 py-3 text-sm font-medium transition-all duration-300 ease-in-out',
                      'min-h-[48px] relative overflow-hidden group', // Touch-friendly even on desktop
                      getFocusRing(),
                      isActive
                        ? 'bg-primary/10 text-primary transform translate-x-2'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent hover:transform hover:translate-x-1'
                    )}
                  >
                    {/* Hover background effect */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent transition-all duration-300 ease-in-out",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )} />
                    
                    <Icon className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300 ease-in-out",
                      isActive ? "transform scale-110" : "group-hover:transform group-hover:scale-105"
                    )} />
                    <span className="relative z-10 transition-all duration-300 ease-in-out">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Desktop User Profile */}
            <div className="sticky bottom-0 w-full p-4 border-t bg-card mt-auto">
              <div className="flex items-center space-x-3">
                <Avatar className="transition-transform duration-200 ease-in-out hover:scale-110">
                  <AvatarImage 
                    src={getAvatarUrl() || undefined} 
                    alt={`${profile?.full_name || 'User'}'s profile picture`}
                  />
                  <AvatarFallback>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile?.full_name || profile?.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile?.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutClick}
                  className={cn(
                    'text-muted-foreground hover:text-foreground transition-all duration-200 ease-in-out hover:scale-110',
                    getFocusRing()
                  )}
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          {isMobile && (
            <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
              <MobileNavigation
                isOpen={mobileNavOpen}
                onToggle={() => setMobileNavOpen(!mobileNavOpen)}
              />
              <div className="text-lg font-bold text-foreground">FocusFlow</div>
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8 transition-transform duration-200 ease-in-out hover:scale-110">
                  <AvatarImage 
                    src={getAvatarUrl() || undefined} 
                    alt={`${profile?.full_name || 'User'}'s profile picture`}
                  />
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutClick}
                  className={cn(
                    'text-muted-foreground hover:text-foreground transition-all duration-200 ease-in-out hover:scale-110',
                    getFocusRing()
                  )}
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>
          )}

          <main id="main-content" className="flex-1 overflow-auto">
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
};

export default Layout;
