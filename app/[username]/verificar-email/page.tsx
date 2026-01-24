'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no proporcionado');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verificado exitosamente');
        } else {
          setStatus('error');
          setMessage(data.error || 'Error al verificar el email');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Error al conectar con el servidor');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen gradient-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Verificación de Email</CardTitle>
          <CardDescription>Verificando tu cuenta...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {status === 'success' && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">
                  {message}
                </AlertDescription>
              </Alert>
              <div className="pt-4">
                <Link href="/proveedor/login">
                  <Button className="w-full">
                    Ir a Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              <div className="pt-4">
                <Link href="/proveedor/register">
                  <Button variant="outline" className="w-full">
                    Volver al Registro
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
