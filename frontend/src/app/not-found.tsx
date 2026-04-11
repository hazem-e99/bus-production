import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">الصفحة غير موجودة</h1>
        <p className="text-muted-foreground mb-6">الصفحة التي تبحث عنها غير متاحة.</p>
        <Link href="/" className="inline-block px-4 py-2 rounded bg-primary text-primary-foreground">العودة للصفحة الرئيسية</Link>
      </div>
    </div>
  );
}


