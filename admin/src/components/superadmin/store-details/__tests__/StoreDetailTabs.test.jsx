import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StoreDetailTabs from '../StoreDetailTabs';

describe('StoreDetailTabs', () => {
  it('renders all main tabs and keeps the active one highlighted', () => {
    render(
      <StoreDetailTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'subscription', label: 'Subscription' },
          { id: 'security', label: 'Security' },
        ]}
        activeTab="overview"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscription' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveClass('bg-emerald-50');
  });
});
