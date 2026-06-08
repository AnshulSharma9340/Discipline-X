import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://discipline-x.me';
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.svg`;

type Props = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
};

export function Seo({ title, description, path, image, noindex }: Props) {
  const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="DisciplineX" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
