"use client";

import { RequireAuth } from "@/components/ui";
import { EnglishRoom } from "@/components/english/EnglishRoom";

export default function EnglishPage() {
  return <RequireAuth><EnglishRoom /></RequireAuth>;
}
