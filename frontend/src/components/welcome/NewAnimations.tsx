'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';

// Liquid Morphing Effect
export function LiquidMorphing() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const morphPaths = [
      "M0,0 Q50,20 100,0 T200,0 L200,100 Q150,80 100,100 T0,100 Z",
      "M0,0 Q30,40 60,20 T120,0 L200,0 L200,100 Q170,60 140,80 T0,100 Z",
      "M0,0 Q20,60 40,30 T80,0 L200,0 L200,100 Q180,40 160,70 T0,100 Z",
      "M0,0 Q40,10 80,30 T160,0 L200,0 L200,100 Q160,90 120,70 T0,100 Z"
    ];

    let currentPath = 0;
    const interval = setInterval(() => {
      gsap.to(path, {
        attr: { d: morphPaths[currentPath] },
        duration: 2,
        ease: "power2.inOut"
      });
      currentPath = (currentPath + 1) % morphPaths.length;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 200 100">
        <defs>
          <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <motion.path
          ref={pathRef}
          d="M0,0 Q50,20 100,0 T200,0 L200,100 Q150,80 100,100 T0,100 Z"
          fill="url(#liquidGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
      </svg>
    </div>
  );
}

// Neural Network Animation
export function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    connections: number[];
  }>>([]);

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

    // Create nodes
    const nodeCount = 50;
    nodesRef.current = Array.from({ length: nodeCount }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      connections: []
    }));

    // Create connections
    nodesRef.current.forEach((node, i) => {
      node.connections = nodesRef.current
        .map((_, j) => j)
        .filter(j => j !== i && Math.random() < 0.1);
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update nodes
      nodesRef.current.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Draw connections
        node.connections.forEach(connectionIndex => {
          const connectedNode = nodesRef.current[connectionIndex];
          const distance = Math.sqrt(
            Math.pow(node.x - connectedNode.x, 2) + 
            Math.pow(node.y - connectedNode.y, 2)
          );

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(connectedNode.x, connectedNode.y);
            ctx.strokeStyle = `rgba(14, 165, 233, ${0.3 * (1 - distance / 150)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0ea5e9';
        ctx.fill();
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
      className="absolute inset-0 pointer-events-none opacity-40"
      style={{ zIndex: 1 }}
    />
  );
}

// Holographic Card Effect
export function HolographicCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-600/20 rounded-lg"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />
      <motion.div
        className="relative bg-slate-800/50 backdrop-blur-md rounded-lg p-6 border border-cyan-400/30"
        animate={{
          boxShadow: [
            '0 0 20px rgba(14, 165, 233, 0.3)',
            '0 0 40px rgba(14, 165, 233, 0.6)',
            '0 0 20px rgba(14, 165, 233, 0.3)'
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// Glitch Text with New Effect
export function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <motion.span
        className="relative z-10"
        animate={isGlitching ? {
          x: [0, -3, 3, -2, 2, 0],
          y: [0, 2, -2, 1, -1, 0],
          color: ['#0ea5e9', '#ff0080', '#00ff80', '#8000ff', '#0ea5e9']
        } : {}}
        transition={{ duration: 0.3 }}
      >
        {text}
      </motion.span>
      {isGlitching && (
        <>
          <motion.span
            className="absolute top-0 left-0 text-red-500 opacity-70"
            animate={{ x: [0, -2, 2, 0] }}
            transition={{ duration: 0.1, repeat: 3 }}
          >
            {text}
          </motion.span>
          <motion.span
            className="absolute top-0 left-0 text-green-500 opacity-70"
            animate={{ x: [0, 2, -2, 0] }}
            transition={{ duration: 0.1, repeat: 3, delay: 0.05 }}
          >
            {text}
          </motion.span>
          <motion.span
            className="absolute top-0 left-0 text-purple-500 opacity-70"
            animate={{ x: [0, -1, 1, 0] }}
            transition={{ duration: 0.1, repeat: 3, delay: 0.1 }}
          >
            {text}
          </motion.span>
        </>
      )}
    </div>
  );
}

// Magnetic Button with New Effect
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
        x: x * 0.2,
        y: y * 0.2,
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

// Wave Distortion Effect
export function WaveDistortion() {
  return (
    <div className="absolute bottom-0 left-0 w-full h-32 overflow-hidden">
      <motion.div
        className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-cyan-400/30 to-transparent"
        animate={{
          clipPath: [
            'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)',
            'polygon(0% 100%, 20% 80%, 40% 100%, 60% 70%, 80% 100%, 100% 80%, 100% 0%, 0% 0%)',
            'polygon(0% 100%, 30% 90%, 50% 100%, 70% 80%, 90% 100%, 100% 90%, 100% 0%, 0% 0%)',
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
