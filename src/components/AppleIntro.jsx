import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GREETINGS = {
    Mixed: [
        { lang: 'English', text: 'Hello' },
        { lang: 'Hindi', text: 'नमस्ते' },
        { lang: 'Spanish', text: 'Hola' },
        { lang: 'Telugu', text: 'నమస్కారం' },
        { lang: 'French', text: 'Bonjour' },
    ],
    English: [{ lang: 'English', text: 'Hello' }],
    Hindi: [{ lang: 'Hindi', text: 'नमस्ते' }],
    Spanish: [{ lang: 'Spanish', text: 'Hola' }],
    French: [{ lang: 'French', text: 'Bonjour' }],
    German: [{ lang: 'German', text: 'Hallo' }],
    Chinese: [{ lang: 'Chinese', text: '你好' }],
    Japanese: [{ lang: 'Japanese', text: 'こんにちは' }],
    Arabic: [{ lang: 'Arabic', text: 'مرحباً' }],
    Russian: [{ lang: 'Russian', text: 'Привет' }],
    Portuguese: [{ lang: 'Portuguese', text: 'Olá' }],
    Italian: [{ lang: 'Italian', text: 'Ciao' }],
    Korean: [{ lang: 'Korean', text: '안녕하세요' }],
    Telugu: [{ lang: 'Telugu', text: 'నమస్కారం' }],
    Tamil: [{ lang: 'Tamil', text: 'வணக்கம்' }],
    Bengali: [{ lang: 'Bengali', text: 'নমস্কার' }],
    Marathi: [{ lang: 'Marathi', text: 'नमस्कार' }],
    Gujarati: [{ lang: 'Gujarati', text: 'નમસ્તે' }],
    Kannada: [{ lang: 'Kannada', text: 'ನಮಸ್ಕಾರ' }],
    Malayalam: [{ lang: 'Malayalam', text: 'നമസ്കാരം' }],
    Punjabi: [{ lang: 'Punjabi', text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' }],
    'English+Hindi': [
        { lang: 'English', text: 'Hello' },
        { lang: 'Hindi', text: 'नमस्ते' },
    ],
    'English+Telugu': [
        { lang: 'English', text: 'Hello' },
        { lang: 'Telugu', text: 'నమస్కారం' },
    ],
    'English+Tamil': [
        { lang: 'English', text: 'Hello' },
        { lang: 'Tamil', text: 'வணக்கம்' },
    ],
    'English+Spanish': [
        { lang: 'English', text: 'Hello' },
        { lang: 'Spanish', text: 'Hola' },
    ],
    'English+French': [
        { lang: 'English', text: 'Hello' },
        { lang: 'French', text: 'Bonjour' },
    ],
};

const AppleIntro = ({ onComplete, userName, preferredLanguage = 'Mixed' }) => {
    const [index, setIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const greetings = GREETINGS[preferredLanguage] || GREETINGS.Mixed;

    useEffect(() => {
        // Single language or dual language mode
        if (greetings.length <= 2) {
            const timer = setTimeout(() => setIsFinished(true), 1500);
            return () => clearTimeout(timer);
        }

        // Mixed mode: cycle through greetings
        const interval = setInterval(() => {
            setIndex((prev) => {
                if (prev >= greetings.length - 1) {
                    clearInterval(interval);
                    setTimeout(() => setIsFinished(true), 800);
                    return prev;
                }
                return prev + 1;
            });
        }, 600);

        return () => clearInterval(interval);
    }, [preferredLanguage, greetings.length]);

    // Auto-complete after showing final screen for 3 seconds
    useEffect(() => {
        if (isFinished) {
            const autoCompleteTimer = setTimeout(() => {
                onComplete();
            }, 3000);
            return () => clearTimeout(autoCompleteTimer);
        }
    }, [isFinished, onComplete]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{
                opacity: 0,
                filter: 'blur(40px)',
                scale: 1.05,
                transition: { duration: 1, ease: [0.23, 1, 0.32, 1] }
            }}
            className="fixed inset-0 z-[99999] bg-white dark:bg-[#000000] flex items-center justify-center overflow-hidden"
            style={{ isolation: 'isolate' }}
        >
            <AnimatePresence mode="wait">
                {!isFinished ? (
                    <motion.h1
                        key={index}
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05, y: -30, filter: 'blur(10px)' }}
                        transition={{
                            duration: 0.6,
                            ease: [0.23, 1, 0.32, 1]
                        }}
                        className="text-7xl md:text-9xl font-black text-gray-900 dark:text-white tracking-tighter relative z-10"
                    >
                        {greetings[index].text}
                        <span className="text-primary">.</span>
                    </motion.h1>
                ) : (
                    <motion.div
                        key="final"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                        className="text-center space-y-6 relative z-10"
                    >
                        <motion.h1
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                            className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight"
                        >
                            Hey, {userName}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 font-medium"
                        >
                            Welcome back to your dashboard
                        </motion.p>
                        <motion.button
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                            onClick={() => onComplete()}
                            className="group relative px-10 py-5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary dark:hover:bg-primary hover:text-white transition-all shadow-2xl active:scale-95 cursor-pointer overflow-hidden"
                        >
                            <span className="relative z-10">Get Started</span>
                            <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.16, 1, 0.3, 1]" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Skip Button */}
            {!isFinished && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    whileHover={{ opacity: 1 }}
                    onClick={() => onComplete()}
                    className="absolute top-12 right-12 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white transition-all z-20 cursor-pointer"
                >
                    Skip Intro
                </motion.button>
            )}

            {/* Background Ornaments with subtle motion */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] pointer-events-none opacity-40 dark:opacity-10"
            >
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-google-blue/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-google-red/10 rounded-full blur-[150px]" />
                <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
            </motion.div>
        </motion.div>
    );
};

export default AppleIntro;
