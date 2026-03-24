import { Link } from 'react-router-dom';
import { CreditCard, Sparkles, Users, Coffee, Database, BrainCircuit, Flame, Trophy, Skull, Pickaxe, Anchor, Construction, ShieldAlert, Link as LinkIcon, ClipboardCheck } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { ProfilePopover } from '@/components/ProfilePopover';
import { useAuth } from '@/contexts/AuthContext';
import './HomePage.scss';

const WELCOME_MESSAGES = [
  { message: "Your cards aren't going to manage themselves.", icon: Coffee },
  { message: "Another day, another card version.", icon: Database },
  { message: "Let's pretend we're excited about card metadata.", icon: BrainCircuit },
  { message: "Remember: you chose this.", icon: Flame },
  { message: "No one has ever described this tool as 'fun'.", icon: Trophy },
  { message: "The cards have been waiting. Passive-aggressively.", icon: Skull },
  { message: "Your single pane of glass for putting cards in a database.", icon: Pickaxe },
  { message: "Let's circle back on those card discrepancies.", icon: Anchor },
  { message: "The dashboard is ready. Whether you are is another question.", icon: Construction },
  { message: "If you're reading this, it's too late. You're a card manager now.", icon: ShieldAlert },
];

const welcomeEntry = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

export function HomePage() {
  const { user, permissions } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const WelcomeIcon = welcomeEntry.icon;

  return (
    <div className="home-page">
      <PageHeader title="Dashboard" actions={<ProfilePopover />} />

      <div className="welcome-banner">
        <WelcomeIcon size={56} className="welcome-icon" />
        <div className="welcome-content">
          <div className="welcome-text">Welcome back, {firstName}.</div>
          <div className="welcome-subtext">{welcomeEntry.message}</div>
        </div>
      </div>

      <div className="nav-cards">
        {permissions['card-manager'] && (
          <>
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

            <Link to="/url-management" className="nav-card">
              <div className="nav-card-icon">
                <LinkIcon size={32} />
              </div>
              <div className="nav-card-content">
                <h2>URL Management</h2>
                <p>Manage website URLs for automated card reviews</p>
              </div>
            </Link>

            <Link to="/reviews" className="nav-card">
              <div className="nav-card-icon">
                <ClipboardCheck size={32} />
              </div>
              <div className="nav-card-content">
                <h2>Card Reviews</h2>
                <p>Automated card review reports and job history</p>
              </div>
            </Link>
          </>
        )}

        {permissions['user-manager'] && (
          <Link to="/users" className="nav-card">
            <div className="nav-card-icon">
              <Users size={32} />
            </div>
            <div className="nav-card-content">
              <h2>User Manager</h2>
              <p>View and manage user accounts, preferences, and access</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
