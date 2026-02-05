'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Link as LinkIcon, Bell, ArrowRight, Zap, BarChart3, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FooterRoot from '@/components/agendar-visita/FooterRoot';
import Link from 'next/link';

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: LinkIcon,
      title: 'Enlaces Personalizados',
      description: 'Crea y comparte enlaces únicos con tus clientes para que agenden citas fácilmente.',
    },
    {
      icon: Calendar,
      title: 'Gestión Automática',
      description: 'Tu agenda se organiza automáticamente, sin conflictos ni dobles reservas.',
    },
    {
      icon: Clock,
      title: 'Ahorra Tiempo',
      description: 'Reduce las llamadas telefónicas y el tiempo dedicado a coordinar citas.',
    },
    {
      icon: Bell,
      title: 'Notificaciones Automáticas',
      description: 'Envía recordatorios automáticos a tus clientes y recibe alertas de nuevas citas.',
    },
  ];

  const howItWorks = [
    { step: 1, title: 'Crea tu Cuenta', description: 'Regístrate en minutos y configura tu perfil profesional.' },
    { step: 2, title: 'Configura tu Horario', description: 'Define tus horarios disponibles y días de trabajo.' },
    { step: 3, title: 'Comparte tu Enlace', description: 'Envía tu enlace personalizado a tus clientes por WhatsApp, email o redes sociales.' },
    { step: 4, title: 'Gestiona tus Citas', description: 'Administra todas tus citas desde un solo lugar, fácil y rápido.' },
  ];

  const benefits = [
    { icon: Zap, title: 'Ahorra Tiempo', description: 'Reduce hasta un 80% del tiempo dedicado a coordinar citas.' },
    { icon: Phone, title: 'Menos Llamadas', description: 'Elimina las llamadas telefónicas repetitivas para agendar citas.' },
    { icon: BarChart3, title: 'Organización Total', description: 'Mantén tu agenda organizada y accesible desde cualquier dispositivo.' },
    { icon: Clock, title: 'Disponible 24/7', description: 'Tus clientes pueden agendar citas en cualquier momento del día.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd]">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-20 bg-[#e8d4cd]"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-40 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-20 bg-[#ba8c84]"
          animate={{ x: [0, -100, 0], y: [0, 80, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 left-1/2 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-20 bg-[#9e7162]"
          animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ba8c84]/20 shadow-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <motion.div
              className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#ba8c84] to-[#9e7162] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#9e7162] truncate">MaxTurnos</h1>
                <p className="text-[10px] sm:text-xs text-[#ba8c84] hidden sm:block">Gestión de Citas Inteligente</p>
              </div>
            </motion.div>

            <motion.div
              className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button asChild variant="outline" size="sm" className="border-[#ba8c84]/50 text-[#9e7162] hover:bg-[#f7e8e4] px-3 sm:px-5 md:px-6 py-1.5 sm:py-2 rounded-full transition-all duration-300 font-medium text-xs sm:text-sm">
                <Link href="/proveedor/login" aria-label="Ingresar al panel de proveedor">Ingresar</Link>
              </Button>
              <Link href="/proveedor/register" aria-label="Registrarme como proveedor">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Registrarme</span>
                    <span className="sm:hidden">Registro</span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 md:px-5 lg:px-1 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: visual hero */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 relative"
          >
            <div className="relative w-full aspect-[4/3] max-h-[420px] flex items-center justify-center">
              {/* Central card */}
              <motion.div
                className="relative z-10 w-full max-w-sm aspect-square rounded-3xl bg-gradient-to-br from-[#ba8c84] to-[#9e7162] shadow-2xl flex items-center justify-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-center p-8">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="mb-4"
                  >
                    <Calendar className="w-20 h-20 sm:w-24 sm:h-24 text-white drop-shadow-lg mx-auto" />
                  </motion.div>
                  <p className="text-white font-semibold text-lg">Turnos en un clic</p>
                </div>
              </motion.div>

              {/* Floating elements */}
              <motion.div
                className="absolute top-0 right-0 sm:right-4 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/95 shadow-xl flex items-center justify-center border border-[#ba8c84]/20"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ scale: 1.1 }}
              >
                <LinkIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#9e7162]" />
              </motion.div>
              <motion.div
                className="absolute bottom-8 left-0 sm:left-4 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/95 shadow-xl flex items-center justify-center border border-[#ba8c84]/20"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.1 }}
              >
                <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-[#9e7162]" />
              </motion.div>
              <motion.div
                className="absolute top-1/3 left-0 sm:-left-2 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#e8d4cd] shadow-lg flex items-center justify-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                whileHover={{ scale: 1.1 }}
              >
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-[#9e7162]" />
              </motion.div>
              <motion.div
                className="absolute bottom-0 right-8 sm:right-12 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#fff3f0] shadow-lg flex items-center justify-center border border-[#ba8c84]/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ scale: 1.1 }}
              >
                <span className="text-[#9e7162] font-bold text-sm">24/7</span>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2 text-center lg:text-left lg:px-12 lg:py-8"
          >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                <span className="text-[#9e7162]">Gestiona tu Agenda</span>
                <span className="block text-[#ba8c84] mt-0.5 sm:mt-1 text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl">
                  Sin Complicaciones
                </span>
              </h1>
            </motion.div>
            <motion.p
              className="text-xl text-[#ba8c84] mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Envía fácilmente un enlace a tus clientes para gestionar tu agenda y ahorra tiempo. La solución más
              simple para administrar tus citas.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start items-center lg:items-start"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link href="/proveedor/register" aria-label="Comenzar gratis como proveedor">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold"
                  >
                    Comenzar Gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Button asChild variant="outline" size="lg" className="border-[#ba8c84]/50 text-[#9e7162] hover:bg-[#f7e8e4] px-8 py-4 rounded-full transition-all duration-300 font-medium">
                <Link href="/proveedor/login" aria-label="Ya tengo cuenta, ir a iniciar sesión">Ya tengo cuenta</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="bg-white/80 text-[#9e7162] hover:bg-white px-8 py-4 rounded-full transition-all duration-300 font-medium">
                <Link href="/agendar" aria-label="Agendar cita como paciente">Agendar cita</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white/60 backdrop-blur-sm relative">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#9e7162] mb-4">Características Principales</h2>
            <p className="text-lg text-[#ba8c84] max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tus citas de manera eficiente y profesional.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#ba8c84]/20 hover:-translate-y-1"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  className="w-14 h-14 bg-gradient-to-br from-[#ba8c84] to-[#9e7162] rounded-xl flex items-center justify-center mb-4 shadow-lg"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-[#9e7162] mb-3">{feature.title}</h3>
                <p className="text-[#ba8c84] leading-relaxed text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd] relative overflow-hidden">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#9e7162] mb-4">Cómo Funciona</h2>
            <p className="text-lg text-[#ba8c84] max-w-2xl mx-auto">
              En solo 4 pasos simples, comienza a gestionar tus citas de manera profesional.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-[#ba8c84] via-[#e8d4cd] to-[#9e7162] opacity-40" />
            {howItWorks.map((step, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#ba8c84]/20 relative z-10">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-[#ba8c84] to-[#9e7162] rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-2xl font-bold text-white">{step.step}</span>
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#9e7162] mb-3 text-center">{step.title}</h3>
                  <p className="text-[#ba8c84] leading-relaxed text-sm text-center">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <motion.div
                    className="hidden lg:block absolute top-20 -right-4 z-20"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 + 0.3 }}
                    viewport={{ once: true }}
                  >
                    <ArrowRight className="w-8 h-8 text-[#ba8c84]" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-white/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#9e7162] mb-4">Beneficios</h2>
            <p className="text-lg text-[#ba8c84] max-w-2xl mx-auto">
              Descubre cómo MaxTurnos puede transformar la manera en que gestionas tus citas.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-white to-[#fff3f0] p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#ba8c84]/20 hover:-translate-y-1"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-[#ba8c84] to-[#9e7162] rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
                >
                  <benefit.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-[#9e7162] mb-3 text-center">{benefit.title}</h3>
                <p className="text-[#ba8c84] leading-relaxed text-sm text-center">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ba8c84] via-[#9e7162] to-[#e8d4cd] opacity-10" />
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#9e7162] mb-10">
              ¿Listo para Simplificar tu Agenda?
            </h2>
            <p className="text-xl text-[#ba8c84] mb-8 max-w-2xl mx-auto">
              Únete a MaxTurnos hoy y comienza a gestionar tus citas de manera profesional. Es gratis y solo toma unos
              minutos configurarlo.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/proveedor/register" aria-label="Comenzar gratis ahora">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-12 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Comenzar Gratis Ahora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <FooterRoot />
    </div>
  );
}
