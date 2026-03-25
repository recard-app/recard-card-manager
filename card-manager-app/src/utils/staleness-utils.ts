import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, AlertOctagon } from 'lucide-react';

export type StalenessTier = 'lt30' | 'gt30' | 'gt60' | 'gt90';

/**
 * Formats an ISO date string as M/D/YYYY (no leading zeros).
 */
export function formatDateShort(dateString?: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return '';
  return `${month}/${day}/${year}`;
}

/**
 * Returns staleness icon and color based on how old a date is.
 * < 30 days: green checkmark
 * 30-60 days: gray clock
 * 60-90 days: yellow warning
 * > 90 days: red alert
 */
export function getStalenessInfo(dateString?: string): { icon: React.ReactNode; color: string } | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 90) {
    return { icon: React.createElement(AlertOctagon, { size: 14 }), color: '#dc2626' };
  } else if (diffDays > 60) {
    return { icon: React.createElement(AlertTriangle, { size: 14 }), color: '#ca8a04' };
  } else if (diffDays > 30) {
    return { icon: React.createElement(Clock, { size: 14 }), color: '#6b7280' };
  } else {
    return { icon: React.createElement(CheckCircle2, { size: 14 }), color: '#16a34a' };
  }
}

/**
 * Returns the staleness tier bucket for a date.
 */
export function getStalenessTier(dateString?: string): StalenessTier | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 90) return 'gt90';
  if (diffDays > 60) return 'gt60';
  if (diffDays > 30) return 'gt30';
  return 'lt30';
}

/**
 * Staleness tier options for filter dropdowns.
 */
export const STALENESS_TIERS: Array<{
  value: StalenessTier;
  label: string;
  color: string;
  Icon: typeof CheckCircle2;
}> = [
  { value: 'lt30', label: '< 30 days', color: '#16a34a', Icon: CheckCircle2 },
  { value: 'gt30', label: '31-60 days', color: '#6b7280', Icon: Clock },
  { value: 'gt60', label: '61-90 days', color: '#ca8a04', Icon: AlertTriangle },
  { value: 'gt90', label: '> 90 days', color: '#dc2626', Icon: AlertOctagon },
];
