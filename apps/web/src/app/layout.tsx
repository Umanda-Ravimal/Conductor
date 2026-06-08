import './global.css';
import Link from 'next/link';

export const metadata = {
  title: 'Conductor — AI Browser Automation',
  description: 'Plain-English goals, AI planning, Puppeteer execution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Conductor
            </Link>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <Link href="/tasks" className="hover:text-foreground">
                Tasks
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
