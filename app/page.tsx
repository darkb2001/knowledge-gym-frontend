import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import "./landing.css";

export const metadata: Metadata = {
  title: "Knowledge Gym — Tập cho kiến thức thành phản xạ",
  description: "Hiểu sâu kiến thức IT, luyện tiếng Anh và ôn lại điều quan trọng. Khám phá diagram, đọc bài viết công khai, đăng nhập khi vào học.",
  alternates: { canonical: "/" },
  openGraph: { title: "Knowledge Gym — Tập cho kiến thức thành phản xạ", description: "Đọc, tự thử, rồi quay lại đúng lúc. Không gian học IT và English Studio.", type: "website", locale: "vi_VN" },
};

/** Public introduction; /learn retains topic-first entry and verified session restoration. */
export default function HomePage() {
  return <LandingPage />;
}
