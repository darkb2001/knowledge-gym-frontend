/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nhạc nền lofi là tệp tĩnh bất biến: cho trình duyệt/CDN cache dài để không tải lại mỗi lần bật.
  async headers() {
    return [
      {
        source: "/lofi/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  // Gộp khu quản trị + hợp nhất các trang trùng chức năng: các URL cũ giữ nguyên hiệu lực.
  async redirects() {
    return [
      { source: "/admin/posts", destination: "/admin/blog", permanent: true },
      { source: "/admin/writer", destination: "/admin/blog?tab=writer", permanent: true },
      { source: "/admin/comments", destination: "/admin/users?tab=comments", permanent: true },
      { source: "/admin/learning", destination: "/admin/users?tab=learning", permanent: true },
      { source: "/admin/search", destination: "/admin/system", permanent: true },
      { source: "/mindmap", destination: "/dashboard?tab=map", permanent: true },
      { source: "/blog/rss", destination: "/blog", permanent: true },
    ];
  },
};

export default nextConfig;
