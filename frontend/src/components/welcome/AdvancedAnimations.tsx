'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';

// Typing Animation Component
export function TypingAnimation({ text, speed = 100, className = "" }: { text: string; speed?: number; className?: string }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-0.5 h-6 bg-blue-400 ml-1"
      />
    </span>
  );
}

// Magnetic Button Component
export function MagneticButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(button, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)"
      });
    };

    button.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}

// Glitch Text Effect
export function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <motion.span
        className="relative z-10"
        animate={isGlitching ? {
          x: [0, -2, 2, -2, 2, 0],
          color: ['#3B82F6', '#FF0000', '#00FF00', '#0000FF', '#3B82F6']
        } : {}}
        transition={{ duration: 0.2 }}
      >
        {text}
      </motion.span>
      {isGlitching && (
        <>
          <motion.span
            className="absolute top-0 left-0 text-red-500 opacity-70"
            animate={{ x: [0, -1, 1, 0] }}
            transition={{ duration: 0.1, repeat: 2 }}
          >
            {text}
          </motion.span>
          <motion.span
            className="absolute top-0 left-0 text-blue-500 opacity-70"
            animate={{ x: [0, 1, -1, 0] }}
            transition={{ duration: 0.1, repeat: 2, delay: 0.05 }}
          >
            {text}
          </motion.span>
        </>
      )}
    </div>
  );
}

// Morphing Shapes Component
export function MorphingShapes() {
  const shapesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shapes = [
      'polygon(50% 0%, 0% 100%, 100% 100%)',
      'polygon(0% 0%, 100% 0%, 50% 100%)',
      'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
      'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      'circle(50% at 50% 50%)',
      'ellipse(50% 25% at 50% 50%)'
    ];

    let currentShape = 0;
    const interval = setInterval(() => {
      if (shapesRef.current) {
        gsap.to(shapesRef.current, {
          clipPath: shapes[currentShape],
          duration: 1,
          ease: "power2.inOut"
        });
        currentShape = (currentShape + 1) % shapes.length;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      ref={shapesRef}
      className="w-32 h-32 bg-gradient-to-r from-blue-400 to-cyan-500 opacity-20"
      initial={{ clipPath: 'circle(50% at 50% 50%)' }}
      animate={{
        rotate: 360,
        scale: [1, 1.2, 1],
      }}
      transition={{
        rotate: { duration: 10, repeat: Infinity, ease: "linear" },
        scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }}
    />
  );
}

// Particle System with Physics
export function PhysicsParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 3 + 1;
        this.color = `hsl(${Math.random() * 60 + 200}, 100%, 50%)`;
        this.life = 0;
        this.maxLife = Math.random() * 300 + 200;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;

        // Bounce off walls
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Apply gravity
        this.vy += 0.01;

        // Friction
        this.vx *= 0.999;
        this.vy *= 0.999;

        // Reset if dead
        if (this.life > this.maxLife) {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
          this.life = 0;
        }
      }

      draw() {
        const alpha = 1 - (this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Create particles
    for (let i = 0; i < 50; i++) {
      particlesRef.current.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-30"
      style={{ zIndex: 1 }}
    />
  );
}

// Wave Animation Component
export function WaveAnimation() {
  return (
    <div className="absolute bottom-0 left-0 w-full h-32 overflow-hidden">
      <motion.div
        className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-blue-400/20 to-transparent"
        animate={{
          clipPath: [
            'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)',
            'polygon(0% 100%, 25% 80%, 50% 100%, 75% 70%, 100% 100%, 100% 0%, 0% 0%)',
            'polygon(0% 100%, 20% 90%, 40% 100%, 60% 80%, 80% 100%, 100% 90%, 100% 0%, 0% 0%)',
            'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)'
          ]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}