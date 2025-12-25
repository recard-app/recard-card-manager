import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Sparkles, GitCompare, CircleUser, LogOut, Home } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import './HomePage.scss';

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileContentRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  // Close profile dropdown on click outside
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
    <div className="home-page">
      <div className="page-header">
        <div className="header-left">
          <button className="home-link" aria-label="Home">
            <Home size={20} />
          </button>
          <h1>ReCard Manager</h1>
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

      <div className="nav-cards">
        <Link to="/cards" className="nav-card">
          <div className="nav-card-icon">
            <CreditCard size={32} />
          </div>
          <div className="nav-card-content">
            <h2>Cards Management</h2>
            <p>View, create, and manage credit card entries and their versions</p>
          </div>
        </Link>

        <Link to="/ai-assistant" className="nav-card">
          <div className="nav-card-icon">
            <Sparkles size={32} />
          </div>
          <div className="nav-card-content">
            <h2>AI Data Entry Assistant</h2>
            <p>Use AI to extract and format credit card data from raw text</p>
          </div>
        </Link>

        <Link to="/card-comparison" className="nav-card">
          <div className="nav-card-icon">
            <GitCompare size={32} />
          </div>
          <div className="nav-card-content">
            <h2>Card Comparison</h2>
            <p>Compare database card data against website text to identify discrepancies</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

