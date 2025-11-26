import React, { useEffect, useState } from 'react';

export const GrainOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" style={{ opacity: 'var(--grain-opacity)', mixBlendMode: 'var(--grain-blend-mode)' }}>
        <div className="absolute -inset-[200%] w-[400%] h-[400%] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.5%22/%3E%3C/svg%3E')] animate-grain" />
    </div>
);

export const Vignette = () => (
    <div className="fixed inset-0 pointer-events-none z-[2] bg-[radial-gradient(circle_at_center,transparent_50%,rgba(var(--shadow-color),0.8)_100%)]" />
);

export const ScrollProgress = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const totalScroll = document.documentElement.scrollTop;
            const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

            if (windowHeight === 0) return setProgress(0);

            const scroll = totalScroll / windowHeight;
            setProgress(scroll);
        }

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="fixed left-0 top-0 bottom-0 w-1.5 bg-black/5 dark:bg-white/5 z-50 hidden md:block">
            <div
                className="w-full transition-all duration-100 ease-out"
                style={{
                    height: `${progress * 100}%`,
                    backgroundColor: 'var(--color-progress)',
                    boxShadow: '0 0 10px var(--color-progress)'
                }}
            />
        </div>
    );
};
