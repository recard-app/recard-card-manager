import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { APP_NAME } from '@/types/constants';
import './PageHeader.scss';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
  backTo?: string;
  className?: string;
}

export function PageHeader({ title, actions, backTo, className }: PageHeaderProps) {
  return (
    <div className={`page-header${className ? ` ${className}` : ''}`}>
      <div className="header-left">
        {backTo && (
          <Link to={backTo} className="header-back" aria-label="Go back">
            <ArrowLeft size={18} />
          </Link>
        )}
        <Link to="/" className="header-brand">
          <img src="/datatrode.svg" alt="" width={20} height={20} />
          <span>{APP_NAME}</span>
        </Link>
        <span className="header-separator">|</span>
        <h1>{title}</h1>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
