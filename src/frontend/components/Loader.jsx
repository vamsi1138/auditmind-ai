import { motion } from "framer-motion";

export default function Loader({ message = "Analyzing contract..." }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-3xl p-10"
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
          className="h-14 w-14 rounded-full border-2 border-cyan-300/25 border-t-cyan-300"
        />
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          className="text-base font-medium text-cyan-100"
        >
          {message}
        </motion.p>
      </div>
    </motion.section>
  );
}
