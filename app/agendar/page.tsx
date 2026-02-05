'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';

const DEMO_PROVIDER_USERNAME = process.env.NEXT_PUBLIC_DEMO_PROVIDER_USERNAME || 'demo';

export default function AgendarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#9e7162]">
          Agendar cita
        </h1>
        <p className="text-[#ba8c84]">
          Para agendar una cita necesitás el enlace de tu profesional. Si tu profesional te pasó su usuario, ingresá en el enlace de abajo.
        </p>
        <Button asChild size="lg" className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] text-white">
          <Link href={`/${DEMO_PROVIDER_USERNAME}/agendar-visita`} aria-label="Agendar con usuario de ejemplo">
            <Calendar className="w-5 h-5 mr-2" />
            Agendar con usuario de ejemplo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Ejemplo: si tu profesional es &quot;drperez&quot;, su enlace es{' '}
          <code className="bg-white/80 px-1 rounded">/drperez/agendar-visita</code>
        </p>
        <Button asChild variant="outline" className="border-[#ba8c84]/50 text-[#9e7162]">
          <Link href="/" aria-label="Volver al inicio">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
