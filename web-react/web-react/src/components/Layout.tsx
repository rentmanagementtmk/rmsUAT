import { useState, type ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { MoreSheet } from './MoreSheet';

/** Standard authenticated-page shell: header + content + bottom nav + more sheet */
export function Layout({ title, headerActions, children }: { title?: string; headerActions?: ReactNode; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <AppHeader title={title} actions={headerActions} />
      <main>{children}</main>
      <BottomNav onMoreClick={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
