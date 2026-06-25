import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface CTASectionProps {
  onConnect?: () => void;
}

export default function CTASection({ onConnect }: CTASectionProps) {
  return (
    <section className='py-20 text-center'>
      <Link href='/trade'>
        <button className='bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto'>
          Get Started <ArrowRight size={16} />
        </button>
      </Link>
    </section>
  );
}