import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface AnimatedGraphBackgroundProps {
  className?: string;
}

export const AnimatedGraphBackground = ({ className = '' }: AnimatedGraphBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use scroll progress from parent section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  // Always visible when section is in viewport - increased minimum opacity
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0.7, 1, 1, 0.7]);
  const scale = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0.98, 1, 1, 0.98]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    let animationFrame: number;
    let time = 0;
    let isAnimating = true;
    let lastFrameTime = 0;
    let initTimeout: NodeJS.Timeout | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;
    
    // Detect mobile for performance optimization
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // Graph data points - reduced to 9 points (Q1-Q9) for spiky appearance
    const dataPoints: Array<{ x: number; y: number; targetY: number }> = [];
    const pointCount = 9; // Match Q1-Q9 quarters for visible spikes
    
    // Padding for graph area (to look more like a real graph) - ensure labels fit within bounds
    const padding = { top: 40, right: 30, bottom: 50, left: 50 };
    let graphWidth = 0;
    let graphHeight = 0;
    let graphX = 0;
    let graphY = 0;
    
    // Store CSS dimensions (not scaled by DPR)
    let cssWidth = 0;
    let cssHeight = 0;
    
    // Initialize data points
    const initDataPoints = () => {
      dataPoints.length = 0;
      // Use CSS dimensions (not canvas.width/height which are scaled by DPR)
      // Ensure graph fits within canvas bounds by using available width minus padding
      graphWidth = Math.max(0, cssWidth - padding.left - padding.right);
      graphHeight = Math.max(0, cssHeight - padding.top - padding.bottom);
      graphX = padding.left;
      graphY = padding.top;
      
      // Distribute points evenly across the graph width
      for (let i = 0; i < pointCount; i++) {
        // Calculate x position ensuring it stays within bounds
        const x = graphX + (i / Math.max(1, pointCount - 1)) * graphWidth;
        // Clamp x to ensure it doesn't exceed bounds
        const clampedX = Math.min(x, graphX + graphWidth);
        dataPoints.push({
          x: clampedX,
          y: graphY + graphHeight / 2,
          targetY: graphY + graphHeight / 2
        });
      }
    };

    const resizeCanvas = () => {
      if (!ctx) return;
      
      if (containerRef.current && containerRef.current.parentElement) {
        const parent = containerRef.current.parentElement;
        const rect = parent.getBoundingClientRect();
        cssWidth = Math.max(rect.width || parent.offsetWidth || window.innerWidth, 100);
        cssHeight = Math.max(rect.height || parent.offsetHeight || window.innerHeight, 100);
        // Set both canvas dimensions and CSS size for proper rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        // Scale context for high DPI displays
        ctx.scale(dpr, dpr);
        initDataPoints();
      } else {
        cssWidth = Math.max(window.innerWidth, 100);
        cssHeight = Math.max(window.innerHeight, 100);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        ctx.scale(dpr, dpr);
        initDataPoints();
      }
    };
    
    // Initial resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (currentTime: number = 0) => {
      if (!isAnimating) return;
      
      // Throttle animation for better performance
      const deltaTime = currentTime - lastFrameTime;
      if (deltaTime < frameInterval && lastFrameTime !== 0) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = currentTime;
      
      // Clear using CSS dimensions (context is already scaled)
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      
      // Ensure canvas has valid dimensions
      if (cssWidth === 0 || cssHeight === 0) {
        resizeCanvas();
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      
      // Reduce animation speed on mobile
      time += isMobile ? 0.01 : 0.015;

      // Update data points with animated values - more vertical movement
      dataPoints.forEach((point, i) => {
        const normalizedX = (point.x - graphX) / graphWidth;
        // More dramatic spikes with fewer points (9 points = Q1-Q9)
        const wave1 = Math.sin(time + normalizedX * Math.PI * 2) * 100;
        const wave2 = Math.cos(time * 0.8 + normalizedX * Math.PI * 3) * 70;
        const wave3 = Math.sin(time * 0.5 + normalizedX * Math.PI * 4) * 40;
        const targetY = graphY + graphHeight / 2 + wave1 + wave2 + wave3;
        // Clamp targetY to stay within graph bounds (with small margin for visual appeal)
        point.targetY = Math.max(graphY + 5, Math.min(graphY + graphHeight - 5, targetY));
        point.y += (point.targetY - point.y) * 0.15; // Faster animation for sharper transitions
        // Ensure final y is also clamped
        point.y = Math.max(graphY + 5, Math.min(graphY + graphHeight - 5, point.y));
      });

      // Draw background with subtle pattern
      ctx.fillStyle = 'rgba(249, 250, 251, 0.5)';
      ctx.fillRect(graphX, graphY, graphWidth, graphHeight);

      // Draw grid lines - more visible and prominent
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)';
      ctx.lineWidth = 1.5;
      
      // Horizontal grid lines (Y-axis)
      const horizontalLines = 6;
      for (let i = 0; i <= horizontalLines; i++) {
        const y = graphY + (graphHeight / horizontalLines) * i;
        ctx.beginPath();
        ctx.moveTo(graphX, y);
        ctx.lineTo(graphX + graphWidth, y);
        ctx.stroke();
        
        // Y-axis labels - more visible (ensure they stay within bounds)
        if (i < horizontalLines) {
          ctx.fillStyle = 'rgba(75, 85, 99, 0.8)';
          ctx.font = 'bold 12px system-ui';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          const value = 100 - (i / horizontalLines) * 200;
          // Ensure label doesn't overflow left boundary
          const labelX = Math.max(padding.left - 12, 5);
          ctx.fillText(value.toString(), labelX, y);
          
          // Add subtle line highlight
          if (i === horizontalLines / 2) {
            ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(graphX, y);
            ctx.lineTo(graphX + graphWidth, y);
            ctx.stroke();
          }
        }
      }

      // Vertical grid lines (X-axis)
      const verticalLines = 8;
      for (let i = 0; i <= verticalLines; i++) {
        const x = graphX + (graphWidth / verticalLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, graphY);
        ctx.lineTo(x, graphY + graphHeight);
        ctx.stroke();
      }

      // Draw X and Y axes - more prominent
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.7)';
      ctx.lineWidth = 2.5;
      
      // Y-axis
      ctx.beginPath();
      ctx.moveTo(graphX, graphY);
      ctx.lineTo(graphX, graphY + graphHeight);
      ctx.stroke();
      
      // X-axis
      ctx.beginPath();
      ctx.moveTo(graphX, graphY + graphHeight);
      ctx.lineTo(graphX + graphWidth, graphY + graphHeight);
      ctx.stroke();

      // Draw axis labels - more visible and styled
      ctx.fillStyle = 'rgba(75, 85, 99, 0.9)';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // X-axis labels with background - ensure they fit within bounds
      for (let i = 0; i <= verticalLines; i++) {
        const x = graphX + (graphWidth / verticalLines) * i;
        // Ensure x is within bounds
        if (x < graphX || x > graphX + graphWidth) continue;
        
        const label = `Q${i + 1}`;
        const labelY = graphY + graphHeight + 10;
        const labelHeight = 18;
        
        // Ensure labels don't overflow bottom boundary
        if (labelY + labelHeight > cssHeight - 5) continue;
        
        // Add subtle background to labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(x - 12, labelY, 24, labelHeight);
        
        ctx.fillStyle = 'rgba(75, 85, 99, 0.9)';
        ctx.fillText(label, x, labelY + 3);
      }
      
      // Y-axis label - more prominent (ensure it stays within bounds)
      const labelX = Math.max(25, padding.left / 2);
      ctx.save();
      ctx.translate(labelX, graphY + graphHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(75, 85, 99, 0.9)';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText('Growth', 0, 0);
      ctx.restore();

      // Fill area under graph with more visible gradient - black theme
      const gradient = ctx.createLinearGradient(graphX, graphY, graphX, graphY + graphHeight);
      gradient.addColorStop(0, 'rgba(17, 24, 39, 0.25)');
      gradient.addColorStop(0.5, 'rgba(17, 24, 39, 0.15)');
      gradient.addColorStop(1, 'rgba(17, 24, 39, 0.08)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(dataPoints[0].x, graphY + graphHeight);
      ctx.lineTo(dataPoints[0].x, dataPoints[0].y);
      
      // Use straight lines instead of bezier curves for spiky appearance
      for (let i = 1; i < dataPoints.length; i++) {
        ctx.lineTo(dataPoints[i].x, dataPoints[i].y);
      }
      
      ctx.lineTo(dataPoints[dataPoints.length - 1].x, graphY + graphHeight);
      ctx.closePath();
      ctx.fill();

      // Draw graph line - spiky/angular lines with shadow effect - black theme
      // Shadow
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.3)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter'; // Sharp corners for spiky look
      
      if (dataPoints.length > 0) {
        ctx.moveTo(dataPoints[0].x, dataPoints[0].y + 2);
        // Use straight lines instead of bezier curves for spiky appearance
        for (let i = 1; i < dataPoints.length; i++) {
          ctx.lineTo(dataPoints[i].x, dataPoints[i].y + 2);
        }
      }
      ctx.stroke();
      
      // Main line - spiky/angular - black
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter'; // Sharp corners for spiky look
      
      if (dataPoints.length > 0) {
        ctx.moveTo(dataPoints[0].x, dataPoints[0].y);
        // Use straight lines instead of bezier curves for spiky appearance
        for (let i = 1; i < dataPoints.length; i++) {
          ctx.lineTo(dataPoints[i].x, dataPoints[i].y);
        }
      }
      ctx.stroke();

      // Draw data points - show all points for spiky graph (9 points total) - black theme
      dataPoints.forEach((point, i) => {
        // Draw all points since we only have 9 now
        // Outer glow
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(17, 24, 39, 0.2)';
        ctx.fill();
        
        // Main point - black
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(17, 24, 39, 1)';
        ctx.fill();
        
        // White border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      animationFrame = requestAnimationFrame(animate);
    };

    // Start animation
    animationFrame = requestAnimationFrame(animate);

    return () => {
      isAnimating = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      window.removeEventListener('resize', resizeCanvas);
      if (resizeObserver && containerRef.current?.parentElement) {
        resizeObserver.unobserve(containerRef.current.parentElement);
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ 
        opacity, 
        scale, 
        zIndex: 1, 
        overflow: 'hidden', 
        width: '100%', 
        height: '100%',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ 
          display: 'block', 
          width: '100%', 
          height: '100%', 
          overflow: 'hidden', 
          maxWidth: '100%',
          maxHeight: '100%',
          willChange: 'contents',
          imageRendering: 'crisp-edges'
        }}
      />
    </motion.div>
  );
};
