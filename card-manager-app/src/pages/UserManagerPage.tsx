import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, CircleUser, LogOut, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { APP_NAME } from '@/types/constants';
import './UserManagerPage.scss';

export function UserManagerPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileContentRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContent = profileContentRef.current && !profileContentRef.current.contains(target);
      const isOutsideTrigger = profileTriggerRef.current && !profileTriggerRef.current.contains(target);

      if (isOutsideContent && isOutsideTrigger) {
        setProfileOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Failed to sign out:', err);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="user-manager-page">
      <div className="page-header">
        <div className="header-left">
          <Link to="/" className="home-link" aria-label="Home">
            <Home size={20} />
          </Link>
          <img src="/datatrode.svg" alt="" width={20} height={20} />
          <h1>{APP_NAME}</h1>
        </div>
        <Popover open={profileOpen} onOpenChange={() => {}}>
          <PopoverTrigger asChild>
            <button
              ref={profileTriggerRef}
              className="profile-trigger"
              onClick={(e) => {
                e.preventDefault();
                setProfileOpen(!profileOpen);
              }}
              aria-label="User profile"
            >
              <CircleUser size={24} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            ref={profileContentRef}
            className="profile-dropdown"
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="profile-info">
              <div className="profile-name">{user?.displayName || 'User'}</div>
              <div className="profile-email">{user?.email || ''}</div>
            </div>
            <div className="profile-divider" />
            <button className="profile-logout" onClick={handleSignOut}>
              <LogOut size={16} />
              Sign out
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="user-manager-placeholder">
        <div className="placeholder-icon">
          <Users size={48} />
        </div>
        <h2>User Manager</h2>
        <p>Coming soon</p>
      </div>
    </div>
  );
}
