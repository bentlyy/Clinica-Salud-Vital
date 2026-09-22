import { useEffect } from 'react';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

export interface SeoProps {
  title?: string;
  description?: string;
}

export function Seo({ title, description }: SeoProps) {
  usePageTitle(title);

  useEffect(() => {
    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      if (!tag) {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description;
        document.head.appendChild(meta);
      } else {
        tag.content = description;
      }
    }
  }, [description]);

  return null;
}