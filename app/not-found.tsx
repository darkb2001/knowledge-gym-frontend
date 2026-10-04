import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-canvas px-5 text-center">
      <h1 className="font-display text-2xl text-strong">Không tìm thấy trang này</h1>
      <p className="max-w-lg text-sm leading-relaxed text-body">Đường dẫn có thể đã đổi hoặc nội dung đã được gộp sang trang khác.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/learn" className="kg-secondary">Chọn chủ đề</Link>
        <Link href="/questions" className="kg-secondary">Thư viện câu hỏi</Link>
      </div>
    </main>
  );
}
