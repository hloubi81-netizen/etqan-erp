import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
              <rect width="40" height="40" rx="10" fill="#3b82f6" fillOpacity="0.3"/>
              <path d="M8 20h24M20 8v24" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="20" cy="20" r="6" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">نظام إتقان</h1>
          <p className="text-blue-200 text-lg mb-12">نظام إدارة الأعمال المتكامل</p>

          {/* Features */}
          <div className="space-y-4 text-right">
            {[
              { icon: "📊", text: "إدارة مالية وحسابية متكاملة" },
              { icon: "📦", text: "تتبع المخزون والمستودعات" },
              { icon: "👥", text: "إدارة الموظفين والرواتب" },
              { icon: "📈", text: "تقارير وتحليلات متقدمة" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <span className="text-xl">{f.icon}</span>
                <span className="text-white/80 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-3">
              <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                <path d="M8 20h24M20 8v24" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="20" cy="20" r="6" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">نظام إتقان</h2>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}