import { useSpring, animated } from '@react-spring/web';
import { useRef } from 'react';

// Tilt Card Animation (from your existing code)
export const TiltCard = ({ children, className }) => {
  const ref = useRef(null);
  const [props, set] = useSpring(() => ({
    xys: [0, 0, 1],
    config: { mass: 5, tension: 350, friction: 40 },
  }));

  const calc = (x, y) => [
    -(y - window.innerHeight / 2) / 20,
    (x - window.innerWidth / 2) / 20,
    1.1,
  ];

  return (
    <animated.div
      ref={ref}
      style={{
        transform: props.xys.to(
          (x, y, s) => `perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`
        ),
      }}
      onMouseMove={({ clientX: x, clientY: y }) => set({ xys: calc(x, y) })}
      onMouseLeave={() => set({ xys: [0, 0, 1] })}
      className={`hover:shadow-xl transition-shadow duration-300 ${className}`}
    >
      {children}
    </animated.div>
  );
};

// Add these new animation components:

// Fade-in Animation
export const FadeIn = ({ children, delay = 0 }) => {
  const props = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration: 500 },
    delay,
  });

  return <animated.div style={props}>{children}</animated.div>;
};

// Slide-up Animation
export const SlideUp = ({ children }) => {
  const props = useSpring({
    from: { transform: 'translateY(50px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
    config: { tension: 200, friction: 25 },
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
      style={props}
      onMouseEnter={() => set({ scale: 1.05 })}
      onMouseLeave={() => set({ scale: 1 })}
    >
      {children}
    </animated.div>
  );
};