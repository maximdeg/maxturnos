import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // En una implementación real, verificarías el token desde cookies o headers
  // Por ahora, la verificación se hace en el middleware y en cada ruta API
  
  return <>{children}</>;
}
