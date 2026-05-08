export default function About() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">عن نظام اتقان ERP</h1>

      <p className="text-muted-foreground leading-relaxed text-base">
        <strong>اتقان ERP</strong> هو نظام متكامل لإدارة موارد المؤسسات مصمم خصيصاً للشركات والمنشآت التجارية الناطقة بالعربية. يجمع النظام بين سهولة الاستخدام والقدرات المتقدمة ليكون الحل الأمثل للمحاسبة المالية، وإدارة المخزون، والموارد البشرية، وعلاقات العملاء — كل ذلك في منصة واحدة متكاملة.
      </p>

      <h2 className="text-xl font-semibold text-foreground">ماذا يقدم النظام؟</h2>
      <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
        <li><strong>المحاسبة المالية:</strong> دليل حسابات متعدد المستويات، فواتير المبيعات والمشتريات، السندات، قوائم الدخل والميزانية العمومية والتدفق النقدي.</li>
        <li><strong>إدارة المخزون:</strong> تتبع الكميات عبر المستودعات، تنبيهات الحد الأدنى، تحويلات المخزون، وإجراء الجرد.</li>
        <li><strong>الموارد البشرية:</strong> إدارة الموظفين، الحضور والغياب، الرواتب، وطلبات الإجازات.</li>
        <li><strong>نقطة البيع (POS):</strong> شاشة بيع سريعة مع دعم الباركود وطرق دفع متعددة.</li>
        <li><strong>التقارير والتحليلات:</strong> تقارير مخصصة قابلة للتصدير وتقارير مالية احترافية.</li>
        <li><strong>إدارة علاقات العملاء (CRM):</strong> متابعة جهات الاتصال والفرص البيعية وخط المبيعات.</li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground">لمن هذا النظام؟</h2>
      <p className="text-muted-foreground leading-relaxed">
        يستهدف اتقان ERP الشركات الصغيرة والمتوسطة في العالم العربي التي تحتاج إلى حل محاسبي ومالي شامل باللغة العربية، سواء كانت شركات تجارية، مصانع، مطاعم، أو أي منشأة تحتاج إلى تتبع المخزون والمالية في آنٍ واحد.
      </p>

      <h2 className="text-xl font-semibold text-foreground">من يطوّر النظام؟</h2>
      <p className="text-muted-foreground leading-relaxed">
        يُطوَّر اتقان ERP بواسطة فريق متخصص في بناء حلول برمجية للشركات العربية، مع التركيز على تجربة المستخدم، الأداء العالي، وأمان البيانات. نسعى دائماً لتحديث النظام وإضافة ميزات جديدة بناءً على احتياجات عملائنا.
      </p>
    </div>
  );
}