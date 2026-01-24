import { notFound } from 'next/navigation';
import { getProviderByUsername } from '@/lib/user-routes';
import ProviderPageClient from './ProviderPageClient';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function ProviderPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { username } = resolvedParams;

  // Obtener información del proveedor directamente del servidor
  const provider = await getProviderByUsername(username);

  if (!provider) {
    notFound();
  }

  // Retornar solo información pública (sin password, tokens, etc.)
  const publicProvider = {
    id: provider.id,
    username: provider.username,
    email: provider.email,
    first_name: provider.first_name || null,
    last_name: provider.last_name || null,
    whatsapp_phone_number: provider.whatsapp_phone_number || null,
    email_verified: provider.email_verified,
    created_at: provider.created_at,
  };

  return <ProviderPageClient provider={publicProvider} username={username} />;
}
