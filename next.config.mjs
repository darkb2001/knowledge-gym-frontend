/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
