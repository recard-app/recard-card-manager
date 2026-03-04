import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  CircleUser,
  LogOut,
  Users,
  Search,
  Copy,
  CreditCard,
  MessageSquare,
  Trash2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { APP_NAME } from '@/types/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { UserService } from '@/services/user.service';
import type {
  UserListItem,
  UserDetail,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingPeriod,
} from '@/types/user-types';
import {
  PLAN_LABELS,
  STATUS_LABELS,
  ROLE_LABELS,
} from '@/types/user-types';
import './UserManagerPage.scss';

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'plus', label: 'Plus' },
  { value: 'pro', label: 'Pro' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'none', label: 'None' },
];

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function getPlanBadgeVariant(plan: string) {
  switch (plan) {
    case 'pro': return 'success' as const;
    case 'plus': return 'info' as const;
    default: return 'secondary' as const;
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active': return 'success' as const;
    case 'expired': return 'error' as const;
    case 'canceled': return 'warning' as const;
    default: return 'secondary' as const;
  }
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'admin': return 'error' as const;
    case 'worker': return 'warning' as const;
    default: return 'secondary' as const;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function UserManagerPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileContentRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  // User list state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Subscription edit state
  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>('free');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('none');
  const [editBillingPeriod, setEditBillingPeriod] = useState<BillingPeriod | null>(null);
  const [editStartedAt, setEditStartedAt] = useState<string>('');
  const [editExpiresAt, setEditExpiresAt] = useState<string>('');
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Profile dropdown click-outside
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

  // Load user list
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await UserService.listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Load user detail
  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    try {
      const detail = await UserService.getUserDetail(userId);
      setUserDetail(detail);
      setIsEditingSubscription(false);
    } catch (err) {
      console.error('Failed to load user detail:', err);
      toast.error('Failed to load user detail');
      setUserDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    loadDetail(userId);
  };

  // Client-side search filter
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Enter subscription edit mode -- populate edit fields from current detail
  const handleEditSubscription = () => {
    if (!userDetail) return;
    setEditPlan(userDetail.subscriptionPlan);
    setEditStatus(userDetail.subscriptionStatus);
    setEditBillingPeriod(userDetail.subscriptionBillingPeriod);
    setEditStartedAt(userDetail.subscriptionStartedAt?.split('T')[0] || '');
    setEditExpiresAt(userDetail.subscriptionExpiresAt?.split('T')[0] || '');
    setIsEditingSubscription(true);
  };

  const handleCancelEditSubscription = () => {
    setIsEditingSubscription(false);
  };

  // Save subscription
  const handleSaveSubscription = async () => {
    if (!selectedUserId || !userDetail) return;
    setSubscriptionSaving(true);
    try {
      await UserService.updateSubscription(selectedUserId, {
        subscriptionPlan: editPlan,
        subscriptionStatus: editStatus,
        subscriptionBillingPeriod: editBillingPeriod,
        subscriptionStartedAt: editStartedAt || null,
        subscriptionExpiresAt: editExpiresAt || null,
      });
      toast.success('Subscription updated');
      setIsEditingSubscription(false);
      // Update sidebar list to reflect the new plan
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === selectedUserId ? { ...u, subscriptionPlan: editPlan } : u
        )
      );
      await loadDetail(selectedUserId);
    } catch (err) {
      console.error('Failed to update subscription:', err);
      toast.error('Failed to update subscription');
    } finally {
      setSubscriptionSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    setDeleting(true);
    try {
      await UserService.deleteUser(selectedUserId);
      toast.success('User deleted');
      setUsers((prev) => prev.filter((u) => u.uid !== selectedUserId));
      setSelectedUserId(null);
      setUserDetail(null);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast.error('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  // Copy UID
  const handleCopyUid = (uid: string) => {
    if (!navigator.clipboard) {
      toast.error('Clipboard not available');
      return;
    }
    navigator.clipboard.writeText(uid).then(
      () => toast.success('UID copied to clipboard'),
      () => toast.error('Failed to copy UID')
    );
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

      <div className="user-manager-content">
        {/* Left panel: User list */}
        <div className="user-list-panel">
          <div className="user-list-header">
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="user-list-body">
            {loading ? (
              <div className="user-list-loading">
                <Loader2 size={24} className="spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="user-list-empty">
                {searchQuery ? 'No users match your search' : 'No users found'}
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className={`user-list-row ${selectedUserId === u.uid ? 'selected' : ''}`}
                  onClick={() => handleSelectUser(u.uid)}
                >
                  <div className="user-list-info">
                    <span className="user-email">{u.email}</span>
                    {u.displayName && (
                      <span className="user-name">{u.displayName}</span>
                    )}
                  </div>
                  <div className="user-list-badges">
                    <Badge variant={getPlanBadgeVariant(u.subscriptionPlan)}>
                      {PLAN_LABELS[u.subscriptionPlan]}
                    </Badge>
                    {u.role !== 'user' && (
                      <Badge variant={getRoleBadgeVariant(u.role)}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="user-list-count">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            {searchQuery && ` (of ${users.length})`}
          </div>
        </div>

        {/* Right panel: User detail */}
        <div className="user-detail-panel">
          {!selectedUserId ? (
            <div className="user-detail-empty">
              <Users size={40} />
              <p>Select a user to view details</p>
            </div>
          ) : detailLoading ? (
            <div className="user-detail-empty">
              <Loader2 size={32} className="spin" />
            </div>
          ) : userDetail ? (
            <div className="user-detail-content">
              {/* Header */}
              <div className="detail-section detail-header">
                <div className="detail-header-top">
                  <h2>{userDetail.displayName || userDetail.email}</h2>
                  <div className="detail-header-badges">
                    <Badge variant={getPlanBadgeVariant(userDetail.subscriptionPlan)}>
                      {PLAN_LABELS[userDetail.subscriptionPlan]}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(userDetail.subscriptionStatus)}>
                      {STATUS_LABELS[userDetail.subscriptionStatus]}
                    </Badge>
                    {userDetail.role !== 'user' && (
                      <Badge variant={getRoleBadgeVariant(userDetail.role)}>
                        {ROLE_LABELS[userDetail.role]}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="detail-email">{userDetail.email}</div>
                <div className="detail-uid">
                  <span className="uid-value">{userDetail.uid}</span>
                  <button
                    className="uid-copy"
                    onClick={() => handleCopyUid(userDetail.uid)}
                    title="Copy UID"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Account Info */}
              <div className="detail-section">
                <div className="detail-section-title">Account</div>
                <div className="detail-field">
                  <span className="field-label">Created</span>
                  <span className="field-value">{formatDate(userDetail.createdAt)}</span>
                </div>
                <div className="detail-field">
                  <span className="field-label">Last Login</span>
                  <span className="field-value">{formatDate(userDetail.lastLoginAt)}</span>
                </div>
                {userDetail.role !== 'user' && (
                  <div className="detail-field">
                    <span className="field-label">Role</span>
                    <span className="field-value">
                      <Badge variant={getRoleBadgeVariant(userDetail.role)}>
                        {ROLE_LABELS[userDetail.role]}
                      </Badge>
                    </span>
                  </div>
                )}
              </div>

              {/* Subscription */}
              <div className="detail-section">
                <div className="detail-section-header">
                  <div className="detail-section-title">Subscription</div>
                  {!isEditingSubscription && (
                    <Button variant="outline" size="sm" onClick={handleEditSubscription}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                  )}
                </div>

                {!isEditingSubscription ? (
                  <>
                    <div className="detail-field">
                      <span className="field-label">Plan</span>
                      <span className="field-value">
                        <Badge variant={getPlanBadgeVariant(userDetail.subscriptionPlan)}>
                          {PLAN_LABELS[userDetail.subscriptionPlan]}
                        </Badge>
                      </span>
                    </div>
                    <div className="detail-field">
                      <span className="field-label">Status</span>
                      <span className="field-value">
                        <Badge variant={getStatusBadgeVariant(userDetail.subscriptionStatus)}>
                          {STATUS_LABELS[userDetail.subscriptionStatus]}
                        </Badge>
                      </span>
                    </div>
                    <div className="detail-field">
                      <span className="field-label">Billing Period</span>
                      <span className="field-value">
                        {userDetail.subscriptionBillingPeriod
                          ? userDetail.subscriptionBillingPeriod.charAt(0).toUpperCase() + userDetail.subscriptionBillingPeriod.slice(1)
                          : '--'}
                      </span>
                    </div>
                    <div className="detail-field">
                      <span className="field-label">Started At</span>
                      <span className="field-value">{formatDate(userDetail.subscriptionStartedAt)}</span>
                    </div>
                    <div className="detail-field">
                      <span className="field-label">Expires At</span>
                      <span className="field-value">{formatDate(userDetail.subscriptionExpiresAt)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="subscription-form">
                      <Select
                        label="Plan"
                        options={PLAN_OPTIONS}
                        value={editPlan}
                        onChange={(val) => setEditPlan(val as SubscriptionPlan)}
                      />
                      <Select
                        label="Status"
                        options={STATUS_OPTIONS}
                        value={editStatus}
                        onChange={(val) => setEditStatus(val as SubscriptionStatus)}
                      />
                      <Select
                        label="Billing Period"
                        options={BILLING_OPTIONS}
                        value={editBillingPeriod || ''}
                        onChange={(val) =>
                          setEditBillingPeriod(val ? (val as BillingPeriod) : null)
                        }
                        clearable
                        clearLabel="None"
                      />
                      <DatePicker
                        label="Started At"
                        value={editStartedAt}
                        onChange={setEditStartedAt}
                        placeholder="No start date"
                      />
                      <DatePicker
                        label="Expires At"
                        value={editExpiresAt}
                        onChange={setEditExpiresAt}
                        placeholder="No expiration"
                      />
                    </div>
                    <div className="subscription-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditSubscription}
                        disabled={subscriptionSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSubscription}
                        disabled={subscriptionSaving}
                      >
                        {subscriptionSaving ? (
                          <>
                            <Loader2 size={14} className="spin" />
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Preferences */}
              {Object.keys(userDetail.preferences).length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-title">Preferences</div>
                  {Object.entries(userDetail.preferences).map(([key, value]) => (
                    <div className="detail-field" key={key}>
                      <span className="field-label">{key}</span>
                      <span className="field-value">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Wallet */}
              <div className="detail-section">
                <div className="detail-section-title">
                  <CreditCard size={14} />
                  Wallet
                </div>
                <div className="detail-field">
                  <span className="field-label">Cards</span>
                  <span className="field-value">{userDetail.wallet.cardCount}</span>
                </div>
                {userDetail.wallet.cardNames.length > 0 && (
                  <div className="wallet-card-list">
                    {userDetail.wallet.cardNames.map((name, i) => (
                      <span key={i} className="wallet-card-item">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Stats */}
              <div className="detail-section">
                <div className="detail-section-title">
                  <MessageSquare size={14} />
                  Chat Stats
                </div>
                <div className="detail-field">
                  <span className="field-label">Total Chats</span>
                  <span className="field-value">{userDetail.chatCount}</span>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="detail-section danger-zone">
                <div className="detail-section-title">Danger Zone</div>
                <p className="danger-description">
                  Permanently delete this user account and all associated data.
                  This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 size={14} />
                  Delete User
                </Button>
              </div>
            </div>
          ) : (
            <div className="user-detail-empty">
              <p>Failed to load user details</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for{' '}
              <strong>{userDetail?.email}</strong> including all their credit cards,
              chat history, and preferences. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 size={14} className="spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
