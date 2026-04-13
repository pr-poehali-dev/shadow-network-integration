const features = [
  { icon: "⏱️", title: "Учёт рабочего времени", desc: "Табели, смены, переработки и ночные часы — всё фиксируется автоматически по каждому водителю." },
  { icon: "🏥", title: "Больничные листы", desc: "Автоматический расчёт больничных по ТК РФ. Интеграция с ФСС и корректные начисления." },
  { icon: "❌", title: "Прогулы и нарушения", desc: "Фиксация прогулов, опозданий и отстранений с автоматическим удержанием из зарплаты." },
  { icon: "💰", title: "Расчёт зарплаты", desc: "Оклад, тарифная ставка, премии, надбавки за маршрут — итоговая сумма рассчитывается в один клик." },
];

export default function Featured() {
  return (
    <div id="features" className="flex flex-col lg:flex-row lg:justify-between lg:items-center min-h-screen px-6 py-12 lg:py-0 bg-white">
      <div className="flex-1 h-[400px] lg:h-[800px] mb-8 lg:mb-0 lg:order-2">
        <div className="w-full h-full bg-neutral-950 flex flex-col justify-center px-10 gap-8">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4 items-start">
              <span className="text-3xl mt-1">{f.icon}</span>
              <div>
                <h4 className="text-white font-semibold text-lg mb-1">{f.title}</h4>
                <p className="text-neutral-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 text-left lg:h-[800px] flex flex-col justify-center lg:mr-12 lg:order-1">
        <h3 className="uppercase mb-4 text-sm tracking-wide text-neutral-600">Для транспортных предприятий</h3>
        <p className="text-2xl lg:text-4xl mb-8 text-neutral-900 leading-tight">
          Забудьте о таблицах Excel и ручных расчётах. RoutePayroll автоматизирует весь цикл — от табеля до расчётного листка.
        </p>
        <button className="bg-black text-white border border-black px-4 py-2 text-sm transition-all duration-300 hover:bg-white hover:text-black cursor-pointer w-fit uppercase tracking-wide">
          Попробовать бесплатно
        </button>
      </div>
    </div>
  );
}