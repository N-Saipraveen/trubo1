import { Database, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full glass-card border-b border-white/20">
      <div className="container flex h-20 items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ duration: 0.3 }}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/50"
          >
            <Database className="h-7 w-7 text-white" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="h-5 w-5 text-yellow-400" />
            </motion.div>
          </motion.div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              TurboDbx
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-medium">Universal Database Converter</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-3"
        >
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Ready to Convert</span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
