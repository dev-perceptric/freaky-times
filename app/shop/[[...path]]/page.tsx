import { permanentRedirect } from 'next/navigation';
import { legacyHref } from '@/lib/catalog';

// Old /shop links (and /shop?q= searches) forward to the new /collections pages.
export default function OldShop({ params, searchParams }: { params: { path?: string[] }; searchParams: Record<string, string | undefined> }) {
  permanentRedirect(legacyHref(params.path, searchParams));
}
