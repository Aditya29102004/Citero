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
  // Always visible when section is in viewport
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0.4, 0.85, 0.85, 0.4]);
  const scale = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0.98, 1, 1, 0.98]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let time = 0;
    let isAnimating = true;
    
    // Graph data points
    const dataPoints: Array<{ x: number; y: number; targetY: number }> = [];
    const pointCount = 100;
    
    // Padding for graph area (to look more like a real graph)
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    let graphWidth = 0;
    let graphHeight = 0;
    let graphX = 0;
    let graphY = 0;
    
    // Initialize data points
    const initDataPoints = () => {
      dataPoints.length = 0;
      graphWidth = canvas.width - padding.left - padding.right;
      graphHeight = canvas.height - padding.top - padding.bottom;
      graphX = padding.left;
      graphY = padding.top;
      
      for (let i = 0; i < pointCount; i++) {
        dataPoints.push({
          x: graphX + (i / pointCount) * graphWidth,
          y: graphY + graphHeight / 2,
          targetY: graphY + graphHeight / 2
        });
      }
    };

    const resizeCanvas = () => {
      if (containerRef.current && containerRef.current.parentElement) {
        const parent = containerRef.current.parentElement;
        const width = Math.max(parent.offsetWidth || window.innerWidth, 100);
        const height = Math.max(parent.offsetHeight || window.innerHeight, 100);
        canvas.width = width;
        canvas.height = height;
        initDataPoints();
      } else {
        const width = Math.max(window.innerWidth, 100);
        const height = Math.max(window.innerHeight, 100);
        canvas.width = width;
        canvas.height = height;
        initDataPoints();
      }
    };
    
    // Initial resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      if (!isAnimating) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Ensure canvas has valid dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        resizeCanvas();
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      
      time += 0.015;

      // Update data points with animated values - more vertical movement
      dataPoints.forEach((point, i) => {
        const normalizedX = (point.x - graphX) / graphWidth;
        const wave1 = Math.sin(time + normalizedX * 4) * 80;
        const wave2 = Math.cos(time * 0.8 + normalizedX * 6) * 60;
        const wave3 = Math.sin(time * 0.5 + normalizedX * 8) * 30;
        point.targetY = graphY + graphHeight / 2 + wave1 + wave2 + wave3;
        point.y += (point.targetY - point.y) * 0.12;
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
        
        // Y-axis labels - more visible
        if (i < horizontalLines) {
          ctx.fillStyle = 'rgba(75, 85, 99, 0.8)';
          ctx.font = 'bold 12px system-ui';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          const value = 100 - (i / horizontalLines) * 200;
          ctx.fillText(value.toString(), graphX - 12, y);
          
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
      
      // X-axis labels with background
      for (let i = 0; i <= verticalLines; i++) {
        const x = graphX + (graphWidth / verticalLines) * i;
        const label = `Q${i + 1}`;
        
        // Add subtle background to labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(x - 12, graphY + graphHeight + 10, 24, 18);
        
        ctx.fillStyle = 'rgba(75, 85, 99, 0.9)';
        ctx.fillText(label, x, graphY + graphHeight + 13);
      }
      
      // Y-axis label - more prominent
      ctx.save();
      ctx.translate(25, graphY + graphHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(75, 85, 99, 0.9)';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText('Growth', 0, 0);
      ctx.restore();

      // Fill area under graph with more visible gradient
      const gradient = ctx.createLinearGradient(graphX, graphY, graphX, graphY + graphHeight);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.08)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(dataPoints[0].x, graphY + graphHeight);
      ctx.lineTo(dataPoints[0].x, dataPoints[0].y);
      
      for (let i = 1; i < dataPoints.length; i++) {
        const prevPoint = dataPoints[i - 1];
        const currPoint = dataPoints[i];
        const cp1x = prevPoint.x + (currPoint.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + 2 * (currPoint.x - prevPoint.x) / 3;
        const cp2y = currPoint.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currPoint.x, currPoint.y);
      }
      
      ctx.lineTo(dataPoints[dataPoints.length - 1].x, graphY + graphHeight);
      ctx.closePath();
      ctx.fill();

      // Draw graph line - smooth curve with shadow effect
      // Shadow
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (dataPoints.length > 0) {
        ctx.moveTo(dataPoints[0].x, dataPoints[0].y + 2);
        for (let i = 1; i < dataPoints.length; i++) {
          const prevPoint = dataPoints[i - 1];
          const currPoint = dataPoints[i];
          const cp1x = prevPoint.x + (currPoint.x - prevPoint.x) / 3;
          const cp1y = prevPoint.y + 2;
          const cp2x = prevPoint.x + 2 * (currPoint.x - prevPoint.x) / 3;
          const cp2y = currPoint.y + 2;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currPoint.x, currPoint.y + 2);
        }
      }
      ctx.stroke();
      
      // Main line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (dataPoints.length > 0) {
        ctx.moveTo(dataPoints[0].x, dataPoints[0].y);
        
        for (let i = 1; i < dataPoints.length; i++) {
          const prevPoint = dataPoints[i - 1];
          const currPoint = dataPoints[i];
          const cp1x = prevPoint.x + (currPoint.x - prevPoint.x) / 3;
          const cp1y = prevPoint.y;
          const cp2x = prevPoint.x + 2 * (currPoint.x - prevPoint.x) / 3;
          const cp2y = currPoint.y;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currPoint.x, currPoint.y);
        }
      }
      ctx.stroke();

      // Draw data points (only some for cleaner look) - more visible
      dataPoints.forEach((point, i) => {
        if (i % 8 === 0) { // Draw more points for better visibility
          // Outer glow
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.fill();
          
          // Main point
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 1)';
          ctx.fill();
          
          // White border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    return () => {
      isAnimating = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ opacity, scale, zIndex: 0 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  );
};
