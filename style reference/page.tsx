"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Calendar, Clock, Link as LinkIcon, Bell, ArrowRight, CheckCircle, Zap, Users, BarChart3, Sparkles, Phone, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import FooterRoot from "@/components/agendar-visita/FooterRoot";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";

export default function Home() {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000,
                retry: 1,
            },
        },
    }));

    const [isVisible, setIsVisible] = useState(false);
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 300], [0, 100]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const features = [
        {
            icon: LinkIcon,
            title: "Enlaces Personalizados",
            description: "Crea y comparte enlaces únicos con tus clientes para que agenden citas fácilmente."
        },
        {
            icon: Calendar,
            title: "Gestión Automática",
            description: "Tu agenda se organiza automáticamente, sin conflictos ni dobles reservas."
        },
        {
            icon: Clock,
            title: "Ahorra Tiempo",
            description: "Reduce las llamadas telefónicas y el tiempo dedicado a coordinar citas."
        },
        {
            icon: Bell,
            title: "Notificaciones Automáticas",
            description: "Envía recordatorios automáticos a tus clientes y recibe alertas de nuevas citas."
        }
    ];

    const howItWorks = [
        {
            step: 1,
            title: "Crea tu Cuenta",
            description: "Regístrate en minutos y configura tu perfil profesional."
        },
        {
            step: 2,
            title: "Configura tu Horario",
            description: "Define tus horarios disponibles y días de trabajo."
        },
        {
            step: 3,
            title: "Comparte tu Enlace",
            description: "Envía tu enlace personalizado a tus clientes por WhatsApp, email o redes sociales."
        },
        {
            step: 4,
            title: "Gestiona tus Citas",
            description: "Administra todas tus citas desde un solo lugar, fácil y rápido."
        }
    ];

    const benefits = [
        {
            icon: Zap,
            title: "Ahorra Tiempo",
            description: "Reduce hasta un 80% del tiempo dedicado a coordinar citas."
        },
        {
            icon: Phone,
            title: "Menos Llamadas",
            description: "Elimina las llamadas telefónicas repetitivas para agendar citas."
        },
        {
            icon: BarChart3,
            title: "Organización Total",
            description: "Mantén tu agenda organizada y accesible desde cualquier dispositivo."
        },
        {
            icon: Clock,
            title: "Disponible 24/7",
            description: "Tus clientes pueden agendar citas en cualquier momento del día."
        }
    ];

    // const testimonials = [
    //     {
    //         name: "María González",
    //         text: "Excelente atención y resultados increíbles. Muy profesional.",
    //         rating: 5
    //     },
    //     {
    //         name: "Carlos Rodríguez",
    //         text: "El Dr. John Doe es muy experto y la atención es personalizada.",
    //         rating: 5
    //     },
    //     {
    //         name: "Ana Martínez",
    //         text: "Recomiendo totalmente. Resolvió mi problema de piel completamente.",
    //         rating: 5
    //     }
    // ];

    return (
        <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-pink-50">
                {/* Animated Background Elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        className="absolute top-20 left-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"
                        animate={{
                            x: [0, 100, 0],
                            y: [0, 50, 0],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    <motion.div
                        className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
                        animate={{
                            x: [0, -100, 0],
                            y: [0, 80, 0],
                        }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    <motion.div
                        className="absolute -bottom-32 left-1/2 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
                        animate={{
                            x: [0, 50, 0],
                            y: [0, -50, 0],
                        }}
                        transition={{
                            duration: 30,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </div>

                {/* Header */}
                <motion.header 
                    className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-lg border-b border-pink-100/50 shadow-sm"
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
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
                                    className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 via-pink-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 relative"
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white absolute inset-0 m-auto" />
                                </motion.div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-400 bg-clip-text text-transparent truncate">
                                        MaxTurnos
                                    </h1>
                                    <p className="text-[10px] sm:text-xs text-gray-700 hidden sm:block">Gestión de Citas Inteligente</p>
                                </div>
                            </motion.div>

                            <motion.div
                                className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Link href="/login">
                                    <Button 
                                        variant="outline"
                                        size="sm"
                                        className="border-pink-300 text-black hover:bg-pink-100 px-3 sm:px-5 md:px-6 py-1.5 sm:py-2 rounded-full transition-all duration-300 font-medium text-xs sm:text-sm"
                                    >
                                        Ingresar
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Button 
                                            size="sm"
                                            className="bg-gradient-to-r from-blue-600 via-pink-500 to-teal-600 hover:from-blue-700 hover:via-pink-600 hover:to-teal-700 text-white px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-xs sm:text-sm"
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

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6 md:px-5 md:pt-25 md:pb-10 lg:px-1 lg:pt-20 lg:pb-0 max-w-7xl mx-auto">
                    <div className="h-full">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left Column - Visual Element */}
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                className="order-2 lg:order-1 relative"
                            >
                                <div className="relative">
                                    {/* Floating Calendar Icon */}
                                    <motion.div
                                        className="absolute top-10 left-10 w-24 h-24 bg-gradient-to-br from-blue-400 to-pink-300 rounded-2xl shadow-2xl flex items-center justify-center"
                                        animate={{
                                            y: [0, -20, 0],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        <Calendar className="w-12 h-12 text-white" />
                                    </motion.div>
                                    
                                    {/* Floating Link Icon */}
                                    <motion.div
                                        className="absolute top-32 right-20 w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl shadow-2xl flex items-center justify-center"
                                        animate={{
                                            y: [0, 15, 0],
                                        }}
                                        transition={{
                                            duration: 2.5,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                            delay: 0.5
                                        }}
                                    >
                                        <LinkIcon className="w-10 h-10 text-white" />
                                    </motion.div>
                                    
                                    {/* Floating Clock Icon */}
                                    <motion.div
                                        className="absolute bottom-20 left-20 w-20 h-20 bg-gradient-to-br from-pink-200 to-pink-300 rounded-2xl shadow-2xl flex items-center justify-center"
                                        animate={{
                                            y: [0, -15, 0],
                                        }}
                                        transition={{
                                            duration: 2.8,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                            delay: 1
                                        }}
                                    >
                                        <Clock className="w-10 h-10 text-white" />
                                    </motion.div>
                                    
                                    {/* Central Gradient Circle */}
                                    <div className="w-full h-96 bg-gradient-to-br from-blue-400 via-pink-300 to-teal-400 rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden">
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                            animate={{
                                                x: ['-100%', '200%'],
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "linear"
                                            }}
                                        />
                                        <div className="relative z-10 text-center p-8">
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.1, 1],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            >
                                                <div className="relative mx-auto mb-4 w-28 h-28 flex items-center justify-center">
                                                    <Calendar className="w-28 h-28 text-white" />
                                                    <Sparkles className="w-10 h-10 text-white absolute inset-0 m-auto" />
                                                </div>
                                            </motion.div>
                                            <h3 className="text-2xl font-bold text-white">Gestión Simplificada</h3>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Right Column - Text Content */}
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                className="order-1 lg:order-2 text-center lg:text-left lg:px-12 lg:py-8"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
                                        <span className="bg-gradient-to-r from-blue-600 via-pink-400 to-teal-600 bg-clip-text text-transparent">
                                            Gestiona tu Agenda
                                        </span>
                                        <span className="block text-gray-800 mt-1 sm:mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">Sin Complicaciones</span>
                                    </h1>
                                </motion.div>
                                
                                <motion.p 
                                    className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    Envía fácilmente un enlace a tus clientes para gestionar tu agenda y ahorra tiempo. 
                                    La solución más simple para administrar tus citas.
                                </motion.p>
                                
                                <motion.div 
                                    className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center lg:items-start"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <Link href="/register">
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Button 
                                                size="lg"
                                                className="bg-gradient-to-r from-blue-600 via-pink-500 to-teal-600 hover:from-blue-700 hover:via-pink-600 hover:to-teal-700 text-white px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold"
                                            >
                                                Comenzar Gratis
                                                <ArrowRight className="w-5 h-5 ml-2" />
                                            </Button>
                                        </motion.div>
                                    </Link>
                                    
                                    <Link href="/login">
                                        <Button 
                                            variant="outline"
                                            size="lg"
                                            className="border-pink-300 text-black hover:bg-pink-100 px-8 py-4 rounded-full transition-all duration-300 font-medium"
                                        >
                                            Ya tengo cuenta
                                        </Button>
                                    </Link>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 px-6 bg-white/60 backdrop-blur-sm relative">
                    <div className="container mx-auto">
                        <motion.div 
                            className="text-center mb-16"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-pink-400 bg-clip-text text-transparent mb-4">
                                Características Principales
                            </h2>
                            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                                Todo lo que necesitas para gestionar tus citas de manera eficiente y profesional.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-pink-100"
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <motion.div 
                                        className="w-14 h-14 bg-gradient-to-br from-blue-400 to-pink-300 rounded-xl flex items-center justify-center mb-4 shadow-lg"
                                        whileHover={{ rotate: 360 }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                                    <p className="text-gray-700 leading-relaxed text-sm">{feature.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="py-20 px-6 bg-gradient-to-br from-pink-50 to-blue-50 relative overflow-hidden">
                    <div className="container mx-auto">
                        <motion.div 
                            className="text-center mb-16"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 to-blue-600 bg-clip-text text-transparent mb-4">
                                Cómo Funciona
                            </h2>
                            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                                En solo 4 pasos simples, comienza a gestionar tus citas de manera profesional.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                            {/* Connection Lines */}
                            <div className="hidden lg:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-pink-200 to-teal-400 opacity-30" />
                            
                            {howItWorks.map((step, index) => (
                                <motion.div
                                    key={index}
                                    className="relative"
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.2 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-pink-100 relative z-10">
                                        <motion.div
                                            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-pink-400 rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg"
                                            whileHover={{ scale: 1.1, rotate: 360 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <span className="text-2xl font-bold text-white">{step.step}</span>
                                        </motion.div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">{step.title}</h3>
                                        <p className="text-gray-700 leading-relaxed text-sm text-center">{step.description}</p>
                                    </div>
                                    
                                    {/* Arrow between steps */}
                                    {index < howItWorks.length - 1 && (
                                        <motion.div
                                            className="hidden lg:block absolute top-20 -right-4 z-20"
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.2 + 0.3 }}
                                            viewport={{ once: true }}
                                        >
                                            <ArrowRight className="w-8 h-8 text-pink-300" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-20 px-6 bg-white/60 backdrop-blur-sm">
                    <div className="container mx-auto">
                        <motion.div 
                            className="text-center mb-16"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-4">
                                Beneficios
                            </h2>
                            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                                Descubre cómo MaxTurnos puede transformar la manera en que gestionas tus citas.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {benefits.map((benefit, index) => (
                                <motion.div
                                    key={index}
                                    className="bg-gradient-to-br from-white to-pink-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-pink-100"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <motion.div 
                                        className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg"
                                        animate={{
                                            y: [0, -10, 0],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                            delay: index * 0.2
                                        }}
                                    >
                                        <benefit.icon className="w-8 h-8 text-white" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">{benefit.title}</h3>
                                    <p className="text-gray-700 leading-relaxed text-sm text-center">{benefit.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Choose Us Section */}
                {/*
                <section className="py-20 px-6">
                    <div className="container mx-auto">
                        <motion.div 
                            className="text-center mb-16"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl font-bold text-[#9e7162] mb-4">¿Por Qué Elegirnos?</h2>
                            <p className="text-lg text-[#ba8c84] max-w-2xl mx-auto">
                                Más de 15 años de experiencia cuidando la salud de tu piel con resultados comprobados.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { icon: Award, title: "Experiencia", value: "15+ Años" },
                                { icon: Users, title: "Pacientes", value: "5000+" },
                                { icon: Star, title: "Satisfacción", value: "98%" },
                                { icon: Shield, title: "Garantía", value: "100%" }
                            ].map((stat, index) => (
                                <motion.div
                                    key={index}
                                    className="text-center"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-[#e8d4cd] to-[#ba8c84] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <stat.icon className="w-10 h-10 text-[#9e7162]" />
                                    </div>
                                    <div className="text-3xl font-bold text-[#9e7162] mb-2">{stat.value}</div>
                                    <div className="text-[#ba8c84] font-medium">{stat.title}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
                */}

                {/* Testimonials Section */}
                {/* <section className="py-20 px-6 bg-white/50">
                    <div className="container mx-auto">
                        <motion.div 
                            className="text-center mb-16"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl font-bold text-[#9e7162] mb-4">Lo Que Dicen Nuestros Pacientes</h2>
                            <p className="text-lg text-[#ba8c84] max-w-2xl mx-auto">
                                Testimonios reales de pacientes satisfechos con nuestros tratamientos.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {testimonials.map((testimonial, index) => (
                                <motion.div
                                    key={index}
                                    className="bg-white p-8 rounded-2xl shadow-lg"
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.2 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="flex mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                                        ))}
                                    </div>
                                    <p className="text-[#ba8c84] mb-6 italic leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
                                    <div className="font-semibold text-[#9e7162]">{testimonial.name}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section> */}

                {/* CTA Section */}
                <section className="py-20 px-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-pink-300 to-teal-500 opacity-10" />
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <motion.h2 
                                className="text-4xl md:text-5xl font-bold mb-10 bg-gradient-to-r from-blue-600 via-pink-400 to-teal-600 bg-clip-text text-transparent"
                                animate={{
                                    backgroundPosition: ['0%', '100%'],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                }}
                            >
                                ¿Listo para Simplificar tu Agenda?
                            </motion.h2>
                            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
                                Únete a MaxTurnos hoy y comienza a gestionar tus citas de manera profesional. 
                                Es gratis y solo toma unos minutos configurarlo.
                            </p>

                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Link href="/register">
                                    <Button 
                                        size="lg"
                                        className="bg-gradient-to-r from-blue-600 via-pink-500 to-teal-600 hover:from-blue-700 hover:via-pink-600 hover:to-teal-700 text-white px-12 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold relative overflow-hidden"
                                    >
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                            animate={{
                                                x: ['-100%', '200%'],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "linear"
                                            }}
                                        />
                                        <span className="relative z-10 flex items-center">
                                            <div className="relative mr-3 w-7 h-7 flex items-center justify-center">
                                                <Calendar className="w-7 h-7" />
                                                <Sparkles className="w-3.5 h-3.5 absolute inset-0 m-auto" />
                                            </div>
                                            Comenzar Gratis Ahora
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </span>
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                <FooterRoot />
            </div>
        </QueryClientProvider>
    );
} 