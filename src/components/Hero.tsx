import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "50vh"]);

  return (
    <div
      ref={container}
      className="relative flex items-center justify-center h-screen overflow-hidden"
    >
      <motion.div
        style={{ y }}
        className="absolute inset-0 w-full h-full"
      >
        <img
          src="https://cdn.poehali.dev/projects/8799d1ed-43ca-462c-b84d-2f8534d0b355/files/4dc1b722-832f-4b66-92e5-eac9eedd7e6d.jpg"
          alt="Автопарк маршрутных автобусов"
          className="w-full h-full object-cover"
        />
      </motion.div>

      <div className="relative z-10 text-center text-white px-4" style={{textShadow: '0 2px 16px rgba(0,0,0,0.7)'}}>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 uppercase">
          Зарплата<br/>без хаоса
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto px-6 opacity-90">
          Автоматический расчёт зарплат водителей автобусов с учётом рабочего времени, больничных и прогулов
        </p>
        <button className="mt-8 bg-white text-black px-8 py-3 uppercase tracking-wide text-sm font-semibold hover:bg-neutral-200 transition-colors duration-300 cursor-pointer">
          Запросить демо
        </button>
      </div>
    </div>
  );
}