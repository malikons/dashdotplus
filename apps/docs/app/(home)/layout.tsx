import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout
      {...baseOptions()}
      links={[
        { url: '/docs', text: 'Documentation' },
        { url: 'https://github.com/malikons/dashdotplus', text: 'GitHub' },
      ]}
    >
      {children}
    </HomeLayout>
  );
}
