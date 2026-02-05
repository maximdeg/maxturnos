'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const resetSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  username: z.string().optional(),
  new_password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('auth_token'));
    }
  }, []);

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '', username: '', new_password: '' },
  });

  const onSubmit = async (data: ResetFormData) => {
    setError(null);
    setSuccess(null);
    if (!token) {
      setError('Debes iniciar sesión como super administrador.');
      router.push('/admin/login');
      return;
    }
    try {
      const response = await fetch('/api/admin/master-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: data.email,
          username: data.username?.trim() || undefined,
          new_password: data.new_password,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError(result.error || 'No autorizado.');
          router.push('/admin/login');
          return;
        }
        setError(result.error || 'Error al restablecer contraseña.');
        return;
      }
      setSuccess('Contraseña actualizada correctamente.');
      form.reset();
    } catch {
      setError('Error de conexión. Por favor, intenta de nuevo.');
    }
  };

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
              Debes iniciar sesión como super administrador para acceder.
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
          <CardTitle>Restablecer contraseña de usuario</CardTitle>
          <CardDescription>
            {id ? `Restablecer contraseña (usuario/proveedor id: ${id})` : 'Ingresá el correo y la nueva contraseña.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico del usuario</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de usuario (opcional, para proveedores)</FormLabel>
                    <FormControl>
                      <Input placeholder="mi-username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Restablecer contraseña'
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/providers">Volver</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
