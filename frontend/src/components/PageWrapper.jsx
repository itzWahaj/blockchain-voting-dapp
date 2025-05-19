// src/components/PageWrapper.jsx
import { useSpring, animated } from '@react-spring/web';

export default function PageWrapper({ children }) {
  const props = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: { tension: 180, friction: 22 },
  });

  return <animated.div style={props}>{children}</animated.div>;
}