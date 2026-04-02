/**
 * أداة تحويل الوحدات
 * الوحدة الأساسية (conversion_factor = 1) هي مرجع الحساب
 */

/**
 * تحويل الكمية من وحدة معينة إلى الوحدة الأساسية
 * مثال: 2 كرتونة × 12 = 24 قطعة
 */
export function toBaseUnit(quantity, unit) {
  const factor = parseFloat(unit?.conversion_factor) || 1;
  return quantity * factor;
}

/**
 * حساب السعر للوحدة المختارة بناءً على السعر الأساسي
 * مثال: سعر القطعة 10 → سعر الكرتونة (12) = 120
 */
export function priceForUnit(basePrice, unit) {
  if (!unit) return basePrice;
  // إذا كان للوحدة سعر مخصص فاستخدمه، وإلا احسبه
  if (unit.price && unit.price > 0) return unit.price;
  const factor = parseFloat(unit.conversion_factor) || 1;
  return basePrice * factor;
}

/**
 * الوحدة الأساسية للمنتج (conversion_factor = 1)
 */
export function getBaseUnit(units = []) {
  return units.find((u) => parseFloat(u.conversion_factor) === 1) || units[0];
}

/**
 * الحصول على الوحدة بالاسم
 */
export function findUnit(units = [], name) {
  return units.find((u) => u.name === name);
}