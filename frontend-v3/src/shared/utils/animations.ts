export const motions = {
  div: 'div' as const,
  span: 'span' as const,
};

// Simple animation variants for MUI sx + motion.div usage
// Using inline framer-motion via a wrapper component
import { motion } from 'framer-motion';

export const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const MotionDiv = motion.div;
