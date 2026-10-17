import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

// Raw <img> tags do not get the deploy prefix from Next in a static export, so
// the path is built from the inlined base path - see next.config.mjs.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: 'malikons',
  repo: 'dashdotplus',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-4">
          <Image
            src={`${base}/img/logo512.png`}
            alt="dash.+ Logo"
            width={20}
            height={20}
          />
          <span>Dash.+</span>
        </div>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
