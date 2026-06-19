import './global.css';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Conductor — AI Browser Automation',
  description: 'Plain-English goals, AI planning, Puppeteer execution',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="bg-header">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-bold leading-none tracking-tight"
            >
              <Image
                src="/icon.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded object-contain"
                priority
              />
              <span>Conductor</span>
            </Link>
            <nav className="flex gap-6 text-sm text-white">
              <Link
                href="/"
                className="h-[30px] w-[80px] rounded-2xl bg-secondary py-1 text-center text-secondary-foreground transition-colors hover:bg-accent"
              >
                Home
              </Link>
              <Link
                href="/tasks"
                className="h-[30px] w-[80px] rounded-2xl bg-secondary py-1 text-center text-secondary-foreground transition-colors hover:bg-accent"
              >
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
