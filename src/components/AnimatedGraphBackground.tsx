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
      
      // Determine if desktop or mobile screen
      const isDesktop = cssWidth >= 1024;
      
      // On desktop, the active spiky graph stays on the left half (42% of width)
      // On mobile, the graph can take the full width of the spacer element
      graphWidth = isDesktop 
        ? Math.max(0, cssWidth * 0.42)
        : Math.max(0, cssWidth - padding.left - padding.right);
        
      graphHeight = Math.max(0, cssHeight - padding.top - padding.bottom);
      graphX = padding.left;
      graphY = padding.top;
      
      // Distribute points evenly across the active graph width
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

      // Draw background with subtle pattern - make fully transparent to blend
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(graphX, graphY, graphWidth, graphHeight);

      // Create linear gradient gridline stroke that extends to the right and fades out behind texts
      const gridGrad = ctx.createLinearGradient(graphX, 0, cssWidth - padding.right, 0);
      gridGrad.addColorStop(0, 'rgba(156, 163, 175, 0.12)'); // visible in active graph area
      gridGrad.addColorStop(0.35, 'rgba(156, 163, 175, 0.10)'); // starts to fade
      gridGrad.addColorStop(0.65, 'rgba(156, 163, 175, 0.02)'); // extremely soft over the text area
      gridGrad.addColorStop(1, 'rgba(156, 163, 175, 0)'); // fully fades out

      ctx.strokeStyle = gridGrad;
      ctx.lineWidth = 1;
      
      // Horizontal grid lines (Y-axis)
      const horizontalLines = 6;
      for (let i = 0; i <= horizontalLines; i++) {
        const y = graphY + (graphHeight / horizontalLines) * i;
        ctx.beginPath();
        ctx.moveTo(graphX, y);
        ctx.lineTo(cssWidth - padding.right, y); // extend all the way to the right edge
        ctx.stroke();
        
        // Y-axis labels - sleek and elegant with % suffix
        if (i < horizontalLines) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'; // slate-400
          ctx.font = '500 10px Inter, system-ui';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          const value = 100 - (i / horizontalLines) * 200;
          const labelX = Math.max(padding.left - 12, 5);
          ctx.fillText(value.toString() + '%', labelX, y);
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

      // Draw X and Y axes - thin and clean
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
      ctx.lineWidth = 1.2;
      
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

      // Draw axis labels - styled beautifully
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '500 10px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // X-axis labels (Months instead of generic Q quarters)
      for (let i = 0; i <= verticalLines; i++) {
        const x = graphX + (graphWidth / verticalLines) * i;
        if (x < graphX || x > graphX + graphWidth) continue;
        
        const label = `Month ${i + 1}`;
        const labelY = graphY + graphHeight + 12;
        
        ctx.fillText(label, x, labelY);
      }
      
      // Title label at top-left
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // slate-900
      ctx.font = '600 11px Inter, system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('AI GEO VISIBILITY INDEX', graphX, graphY - 15);

      // Fill area under graph with gorgeous translucent dark gray gradient
      const gradient = ctx.createLinearGradient(graphX, graphY, graphX, graphY + graphHeight);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.08)'); // Translucent slate-900
      gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.03)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(dataPoints[0].x, graphY + graphHeight);
      ctx.lineTo(dataPoints[0].x, dataPoints[0].y);
      
      for (let i = 1; i < dataPoints.length; i++) {
        ctx.lineTo(dataPoints[i].x, dataPoints[i].y);
      }
      
      ctx.lineTo(dataPoints[dataPoints.length - 1].x, graphY + graphHeight);
      ctx.closePath();
      ctx.fill();

      // Draw graph line - beautiful charcoal/black line with sharp corners
      const lineGrad = 'rgba(15, 23, 42, 0.95)'; // Deep slate-900 charcoal

      // Premium glowing drop shadow under the line
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      
      ctx.beginPath();
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter'; // Keep the sharp/spiky corners as requested
      
      if (dataPoints.length > 0) {
        ctx.moveTo(dataPoints[0].x, dataPoints[0].y);
        for (let i = 1; i < dataPoints.length; i++) {
          ctx.lineTo(dataPoints[i].x, dataPoints[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Draw data points - beautiful charcoal beads
      dataPoints.forEach((point) => {
        // Outer glow circle
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.fill();
        
        // Inner core point
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 1)'; // Deep slate-900 charcoal
        ctx.fill();
        
        // Crisp white ring border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
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
