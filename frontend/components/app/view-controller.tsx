'use client';

import { motion } from 'motion/react';
import type { AppConfig } from '@/app-config';
import { DukaanExperience } from '@/components/app/dukaan-experience';

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      <DukaanExperience startButtonText={appConfig.startButtonText} />
    </motion.div>
  );
}
