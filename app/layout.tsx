import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SRD — loan operations',
  description: 'Member profiles, proposals, feasibility and loan approval.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="masthead">
            <h1>SRD loan operations</h1>
            <nav>
              <Link href="/">Pipeline</Link>
              <Link href="/members">Members</Link>
              <Link href="/proposals">Proposals</Link>
              <Link href="/import">Upload data</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
