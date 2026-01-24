import { notFound } from 'next/navigation';
import { getUserAccountIdByUsername } from '@/lib/user-routes';
import AppointmentForm from '@/components/agendar-visita/AppointmentForm';
import FooterRoot from '@/components/agendar-visita/FooterRoot';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function AgendarVisitaPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { username } = resolvedParams;

  // Obtener user_account_id del username
  const userAccountId = await getUserAccountIdByUsername(username);

  if (!userAccountId) {
    notFound();
  }

  return (
    <div className="min-h-screen gradient-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header con botón de retroceso */}
        <div className="mb-6">
          <Link href={`/${username}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>

        {/* Formulario */}
        <AppointmentForm userAccountId={userAccountId} username={username} />

        {/* Footer */}
        <FooterRoot />
      </div>
    </div>
  );
}
