import { useSpring, animated } from '@react-spring/web';
import { useRef, useState } from 'react';

const isReducedMotion = () => {
  return document.documentElement.classList.contains("motion-reduce");
};

// Tilt Card Animation
export const TiltCard = ({ children, className }) => {
  const ref = useRef(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, opacity: 0 });

  const [props, set] = useSpring(() => ({
    xys: [0, 0, 1],
    config: { mass: 5, tension: 350, friction: 40 },
  }));

  const handleMouseMove = (e) => {
    if (!ref.current || isReducedMotion()) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate tilt relative to card center for better feel
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Much more subtle tilt (divisor 60) and scale (1.02)
    const tiltX = -(e.clientY - centerY) / 60;
    const tiltY = (e.clientX - centerX) / 60;

    set({ xys: [tiltX, tiltY, 1.02] });
    setSpotlight({ x, y, opacity: 1 });
  };

  const handleMouseLeave = () => {
    if (isReducedMotion()) return;
    set({ xys: [0, 0, 1] });
    setSpotlight(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <animated.div
      ref={ref}
      style={{
        transform: props.xys.to(
          (x, y, s) => isReducedMotion() ? 'none' : `perspective(1000px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`
        ),
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-all duration-500 ${className}`}
    >
      {/* Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 z-50"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(600px circle at ${spotlight.x}px ${spotlight.y}px, rgba(255,255,255,0.08), transparent 40%)`
        }}
      />
      {children}
    </animated.div>
  );
};

// Fade-in Animation
export const FadeIn = ({ children, delay = 0 }) => {
  const props = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration: 500 },
    delay: isReducedMotion() ? 0 : delay,
    immediate: isReducedMotion(),
  });

  return <animated.div style={props}>{children}</animated.div>;
};

// Slide-up Animation
export const SlideUp = ({ children }) => {
  const props = useSpring({
    from: { transform: 'translateY(50px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
    config: { tension: 200, friction: 25 },
    immediate: isReducedMotion(),
  });

  return <animated.div style={props}>{children}</animated.div>;
};

// Hover Scale Animation
export const HoverScale = ({ children }) => {
  const [props, set] = useSpring(() => ({
    scale: 1,
    config: { mass: 1, tension: 300, friction: 15 },
  }));

  return (
    <animated.div
      style={{
        ...props,
        transform: props.scale.to(s => isReducedMotion() ? 'none' : `scale(${s})`)
      }}
      onMouseEnter={() => !isReducedMotion() && set({ scale: 1.02 })}
      onMouseLeave={() => !isReducedMotion() && set({ scale: 1 })}
    >
      {children}
    </animated.div>
  );
};