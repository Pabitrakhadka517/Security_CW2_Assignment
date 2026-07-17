import { Truck, ShieldCheck, RefreshCw, Clock, BadgeCheck, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Trustability() {
  const features = [
    { 
      icon: Truck, 
      title: "Free & Fast Delivery", 
      desc: "Free delivery on orders above Rs.5000",
      color: "text-emerald-600",
      bg: "bg-emerald-50/50"
    },
    { 
      icon: BadgeCheck, 
      title: "100% Genuine Products", 
      desc: "Verified authentic products only",
      color: "text-blue-600",
      bg: "bg-blue-50/50"
    },
    { 
      icon: ShieldCheck, 
      title: "Secure Payments", 
      desc: "SSL encrypted checkout",
      color: "text-purple-600",
      bg: "bg-purple-50/50"
    },
    { 
      icon: RefreshCw, 
      title: "Easy Returns", 
      desc: "7 days hassle-free returns",
      color: "text-emerald-600",
      bg: "bg-emerald-50/50"
    },
    { 
      icon: Headphones, 
      title: "24/7 Support", 
      desc: "Always here to help you",
      color: "text-pink-600",
      bg: "bg-pink-50/50"
    },
    { 
      icon: Clock, 
      title: "Quick Dispatch", 
      desc: "Ships within 24 hours",
      color: "text-cyan-600",
      bg: "bg-cyan-50/50"
    },
  ];

  return (
    <section className="py-6 sm:py-12 bg-[#F9FAFB]/50 border-y border-gray-100">
      <div className="px-4 sm:px-6 mx-auto max-w-7xl">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-6"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="flex flex-col items-center p-6 text-center transition-all duration-300 rounded-3xl bg-white border border-gray-100/70 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_20px_40px_rgba(30,41,59,0.04)] hover:border-blue-100/30 group"
            >
              <div className={`flex items-center justify-center w-14 h-14 ${feature.bg} rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h4 className="mb-1 text-sm font-bold text-gray-900 leading-tight">
                {feature.title}
              </h4>
              <p className="text-xs text-gray-400 font-light mt-1">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
} 