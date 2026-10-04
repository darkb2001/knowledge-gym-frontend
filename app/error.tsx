"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Knowledge Gym UI error:", error);
  }, [error]);
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-canvas px-5 text-center">
      <h1 className="font-display text-2xl text-strong">Trang này gặp sự cố</h1>
      <p className="max-w-lg text-sm leading-relaxed text-body">
        Dữ liệu trả về có thể chưa đúng hoặc kết nối bị ngắt giữa chừng. Bạn thử lại — nếu vẫn lỗi, quay về trang chọn chủ đề.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="kg-secondary">Thử lại</button>
        <Link href="/learn" className="kg-secondary">Về trang chọn chủ đề</Link>
      </div>
    </main>
  );
}
