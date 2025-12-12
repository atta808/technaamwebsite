import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-primary mb-8 animate-fade-up">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
          Founded by Atta Ur Rehman Dhothar
        </div>
        
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-dark tracking-tight mb-6 leading-tight animate-fade-up [animation-delay:200ms]">
          Bridging Law & Logic <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500">
            through Code.
          </span>
        </h1>
        
        {/* Subheadline */}
        <p className="max-w-2xl mx-auto text-xl text-slate-500 mb-10 leading-relaxed animate-fade-up [animation-delay:400ms]">
          We engineer world-class digital solutions. From <strong>CardSphere</strong> to <strong>LegalSphereDiary</strong>, we build the tools that power modern legal practices and global enterprises.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-up [animation-delay:600ms]">
          <Link href="/contact" className="px-8 py-4 rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300">
            Start Your Project
          </Link>
          <Link href="/products" className="px-8 py-4 rounded-full bg-white text-dark border border-slate-200 font-bold hover:border-slate-300 hover:bg-slate-50 transition-all duration-300">
            Explore Tools
          </Link>
        </div>
      </div>
    </section>
  );
}