import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { APP_NAME } from '@/types/constants';
import './PageHeader.scss';

interface PageHeaderProps {
  title: string;
  titleExtra?: ReactNode;
  actions?: ReactNode;
  /** Show a back button. If true, uses browser back. If a string, navigates to that path as fallback. */
  backTo?: string | boolean;
  className?: string;
}

export function PageHeader({ title, titleExtra, actions, backTo, className }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // If we have a previous page in the router's history state, go back
    // window.history.state?.idx > 0 is set by React Router and is 0 on first entry
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else if (typeof backTo === 'string') {
      navigate(backTo);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={`page-header${className ? ` ${className}` : ''}`}>
      <div className="header-left">
        {backTo && (
          <button onClick={handleBack} className="header-back" aria-label="Go back" type="button">
            <ArrowLeft size={18} />
          </button>
        )}
        <Link to="/" className="header-brand">
          <img src="/datatrode.svg" alt="" width={20} height={20} />
          <span>{APP_NAME}</span>
        </Link>
        <span className="header-separator">|</span>
        <h1>{title}</h1>
        {titleExtra}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
