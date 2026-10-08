export default function ReportStepper({ steps = [], currentStep = 1 }) {
  return (
    <div className="mb-6 grid grid-cols-4 gap-3">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isComplete = currentStep > stepNumber;

        return (
          <div key={step} className={`rounded-xl border p-3 text-center ${isActive ? 'border-blue-200 bg-blue-50 text-blue-800' : isComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
            <div className="text-xs font-bold uppercase tracking-[0.12em]">Step {stepNumber}</div>
            <div className="mt-1 text-sm font-semibold">{step}</div>
          </div>
        );
      })}
    </div>
  );
}
