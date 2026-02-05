'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminProvidersPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('auth_token'));
    }
  }, []);

  if (token === null) {
    return (
      <div className="min-h-screen gradient-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen gradient-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              Debes iniciar sesión como super administrador.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/login">Ir a inicio de sesión admin</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-background flex items-center justify-center px-4 py-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Panel de administración</CardTitle>
          <CardDescription>Gestión de proveedores y usuarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild variant="default" className="w-full">
            <Link href="/admin/providers/1/reset">Restablecer contraseña de usuario</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
