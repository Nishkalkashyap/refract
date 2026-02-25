import type { NextConfig } from "next";

import { withRefract } from "@nkstack/refract-next-plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default withRefract()(nextConfig);
