"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Calendar, Clock, MapPin, Phone, Star, ArrowRight, Shield, Users, Award, Download } from "lucide-react";
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

    const services = [
        {
            icon: Shield,
            title: "Dermatología General",
            description: "Diagnóstico y tratamiento de enfermedades de la piel, cabello y uñas."
        },
        {
            icon: Users,
            title: "Dermatología Estética",
            description: "Tratamientos para mejorar la apariencia y salud de tu piel."
        },
        {
            icon: Award,
            title: "Cirugía Dermatológica",
            description: "Procedimientos quirúrgicos especializados en dermatología."
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
            <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd]">
                {/* Header */}
                <motion.header 
                    className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ba8c84]/20"
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                        <motion.div 
                            className="flex items-center space-x-3"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-[#ba8c84] to-[#9e7162] rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-lg">D</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-[#9e7162]">Dra. Mara Flamini</h1>
                                <p className="text-sm text-[#ba8c84]">Dermatóloga</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Link href="/agendar-visita">
                                <Button 
                                    className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold"
                                >
                                    <Calendar className="w-5 h-5 mr-2" />
                                    Agendar Cita
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </motion.header>

                {/* Hero Section */}
                <section className="pt-32 pb-20 px-6 md:px-5 md:pt-25 md:pb-10 lg:px-1 lg:pt-20 lg:pb-0 max-w-9xl mx-auto">
                    <div className="h-full">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left Column - Image */}
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                className="order-2 lg:order-1 relative"
                            >
                                <div className="relative">
                                    <img
                                        src="public/images/maraflaminipic.jpg" 
                                        width="500" 
                                        height="400"
                                   
                                        alt="Dermatología"
                                        className="rounded-lg w-full h-full"
                                    />
                                    {/* Fade to right overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#f7e8e4] "></div>
                                </div>
                            </motion.div>

                            {/* Right Column - Text Content */}
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                className="order-1 lg:order-2 text-center lg:text-left md:ml-10"
                            >
                                <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-[#9e7162] mb-6 leading-tight">
                                    Tu Piel, Nuestra
                                    <span className="block text-[#ba8c84]">Especialidad</span>
                                </h1>
                                <p className="text-xl text-[#ba8c84] mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Cuidamos de la salud y belleza de tu piel con la más alta tecnología y experiencia médica especializada.
                                </p>
                                
                                <motion.div 
                                    className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center lg:items-start"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Link href="/agendar-visita">
                                        <Button 
                                            size="lg"
                                            className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-semibold"
                                        >
                                            <Calendar className="w-6 h-6 mr-3" />
                                            Agendar Mi Primera Cita
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </Button>
                                    </Link>
                                    
                                    {/* <Button 
                                        variant="outline" 
                                        size="lg"
                                        className="border-[#ba8c84] text-[#9e7162] hover:bg-[#ba8c84] hover:text-white px-8 py-4 rounded-full transition-all duration-300"
                                    >
                                        <Phone className="w-5 h-5 mr-2" />
                                        Llamar Ahora
                                    </Button> */}
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="py-20 px-6 bg-white/50">
                    <div className="container mx-auto">
                        <motion.div 
                            className="text-center mb-16"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl font-bold text-[#9e7162] mb-4">Nuestros Servicios</h2>
                            <p className="text-lg text-[#ba8c84] max-w-2xl mx-auto">
                                Ofrecemos una amplia gama de servicios dermatológicos con la más alta calidad y tecnología.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {services.map((service, index) => (
                                <motion.div
                                    key={index}
                                    className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.2 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#e8d4cd] to-[#ba8c84] rounded-full flex items-center justify-center mb-6">
                                        <service.icon className="w-8 h-8 text-[#9e7162]" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#9e7162] mb-4">{service.title}</h3>
                                    <p className="text-[#ba8c84] leading-relaxed">{service.description}</p>
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
                <section className="py-20 px-6">
                    <div className="container mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl font-bold text-[#9e7162] mb-6">
                                ¿Listo para Cuidar tu Piel?
                            </h2>
                            <p className="text-xl text-[#ba8c84] mb-8 max-w-2xl mx-auto">
                                Agenda tu cita hoy mismo y comienza tu camino hacia una piel más saludable y radiante.
                            </p>


                            <Link href="/agendar-visita">
                                <Button 
                                    size="lg"
                                    className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-12 py-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-semibold"
                                >
                                    <Calendar className="w-6 h-6 mr-3 text-white " />
                                    Agendar Cita Ahora
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </section>

                <FooterRoot />
                
                {/* Simple Floating Install Button */}
                <motion.div
                    className="fixed bottom-6 right-6 z-50"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2, duration: 0.5 }}
                >
                    <Button
                        className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white rounded-full w-14 h-14 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300"
                        onClick={() => {
                            // Simple PWA install logic
                            if ('serviceWorker' in navigator) {
                                // Check if app can be installed
                                const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
                                const isIOSStandalone = (window.navigator as any).standalone === true;
                                
                                if (!isStandalone && !isIOSStandalone) {
                                    // Show browser's native install prompt
                                    if ('beforeinstallprompt' in window) {
                                        // This will trigger the browser's install prompt
                                        window.dispatchEvent(new Event('beforeinstallprompt'));
                                    } else {
                                        // Fallback for browsers that don't support beforeinstallprompt
                                        alert('Para instalar la app, usa el menú de tu navegador y selecciona "Agregar a pantalla de inicio" o "Instalar app".');
                                    }
                                } else {
                                    alert('La app ya está instalada.');
                                }
                            } else {
                                alert('Tu navegador no soporta la instalación de apps.');
                            }
                        }}
                    >
                        <Download className="w-6 h-6" />
                    </Button>
                </motion.div>
            </div>
        </QueryClientProvider>
    );
} 