import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import './global.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata = {
  metadataBase: new URL('https://malikons.github.io/dashdotplus'),
  icons: {
    icon: '/img/favicon.ico',
  },
  title: 'dash.+ Documentation',
  description:
    'Documentation for dash.+, the self-hosted server monitoring dashboard for single node servers.',
  keywords:
    'dashdotplus, dash.+, documentation, self-hosted, server monitoring, dashboard, single node servers',
  openGraph: {
    title: 'dash.+ Documentation',
    description:
      'Documentation for dash.+, the self-hosted server monitoring dashboard for single node servers.',
    url: 'https://malikons.github.io/dashdotplus',
    siteName: 'dash.+ Documentation',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'dash.+ Documentation',
    description:
      'Documentation for dash.+, the self-hosted server monitoring dashboard for single node servers.',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
