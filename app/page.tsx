import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              MaxTurnos
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Sistema de reserva de turnos médicos multi-proveedor. 
            Gestiona tu agenda de manera sencilla y eficiente.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/proveedor/register">
              <Button size="lg" className="gap-2">
                Registrarse como Proveedor
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/proveedor/login">
              <Button size="lg" variant="outline" className="gap-2">
                <Calendar className="h-5 w-5" />
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
