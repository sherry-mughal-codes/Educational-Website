import type { Metadata } from 'next';
import './globals.css';
import Analytics from '@/components/Analytics';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: {
    template: '%s | FBISE Educational Platform',
    default: 'FBISE Educational Platform | Class 9 & 10 Prep',
  },
  description:
    'Dedicated online study notes, syllabus guides, and verified educational resources for Federal Board of Intermediate and Secondary Education (FBISE) Class 9 and Class 10 students.',
  keywords: [
    'FBISE',
    'Federal Board',
    'Class 9 notes',
    'Class 10 notes',
    'past papers',
    'model papers',
    'matric preparation',
  ],
  authors: [{ name: 'FBISE Prep Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <Navigation />
        <main className="main-content">{children}</main>
        <footer className="footer">
          <div className="container">
            <p>© {new Date().getFullYear()} FBISE Educational Platform. Phase 1 Environment Foundation.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
