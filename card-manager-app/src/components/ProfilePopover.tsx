import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleUser, LogOut } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import './ProfilePopover.scss';

export function ProfilePopover() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContent = contentRef.current && !contentRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);

      if (isOutsideContent && isOutsideTrigger) {
        setOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

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
    <Popover open={open} onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          className="profile-trigger"
          onClick={(e) => {
            e.preventDefault();
            setOpen(!open);
          }}
          aria-label="User profile"
        >
          <CircleUser size={24} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
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
  );
}
