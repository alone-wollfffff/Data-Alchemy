import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -10, filter: 'blur(4px)' },
}

export default function PageTransition({ children, key }) {
  return (
    <motion.div
      key={key}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
