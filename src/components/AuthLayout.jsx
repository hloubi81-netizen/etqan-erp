import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(238,84%,12%)] to-[hsl(217,91%,25%)] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-blue-500/10 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 text-center text-white">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <span className="text-3xl font-bold text-white">E</span>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-3">إتقان ERP</h1>
          <p className="text-blue-200 text-lg mb-10">نظام إدارة المنشآت المتكامل</p>

          {/* Features */}
          <div className="space-y-4 text-right max-w-xs mx-auto">
            {[
              { icon: "📊", text: "إدارة مالية وحسابية متكاملة" },
              { icon: "📦", text: "تحكم كامل في المخزون والمستودعات" },
              { icon: "👥", text: "إدارة الموارد البشرية والرواتب" },
              { icon: "📈", text: "تقارير وتحليلات في الوقت الفعلي" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm text-blue-100">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-white">E</span>
            </div>
            <div>
              <p className="font-bold text-lg text-foreground">إتقان ERP</p>
              <p className="text-xs text-muted-foreground">نظام إدارة متكامل</p>
            </div>
          </div>

          {/* Icon + Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>}
          </div>

          {/* Card */}
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