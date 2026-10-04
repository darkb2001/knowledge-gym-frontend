import { describe, expect, it } from "vitest";
import { TOPIC_PREVIEW_LIMIT, filterModules, filterModulesByTrack, groupModulesByTopic, normalizeSearch } from "./catalog";
import type { Module, Topic } from "./types";

const topics: Topic[] = [
  { id: "java", slug: "java", name: "Java", description: null, displayOrder: 1, moduleCount: 2, track: "java" },
  { id: "db", slug: "db", name: "Cơ sở dữ liệu", description: null, displayOrder: 2, moduleCount: 1, track: "java" },
  { id: "aws-storage", slug: "aws-storage", name: "AWS Storage", description: null, displayOrder: 3, moduleCount: 1, track: "aws" },
];
const modules: Module[] = [
  { id: "sql", slug: "sql", name: "SQL", description: null, displayOrder: 1, topicId: "db", topicSlug: "db", questionCount: 0 },
  { id: "jvm", slug: "jvm", name: "Bộ nhớ JVM", description: "Heap và stack", displayOrder: 2, topicId: "java", topicSlug: "java", questionCount: 4 },
  { id: "core", slug: "core", name: "Java Core", description: null, displayOrder: 1, topicId: "java", topicSlug: "java", questionCount: 7 },
  { id: "s3", slug: "aws-s3", name: "Amazon S3", description: null, displayOrder: 1, topicId: "aws-storage", topicSlug: "aws-storage", questionCount: 10 },
];
describe("topic-first directory", () => {
  it("matches Vietnamese with or without accents and crossed d", () => {
    expect(normalizeSearch("  CƠ SỞ DỮ LIỆU ĐƯỢC  ")).toBe("co so du lieu duoc");
    expect(filterModules(modules, topics, "", "bo nho").map(item => item.id)).toEqual(["jvm"]);
  });
  it("combines the topic selection and query without leaking other topics", () => {
    expect(filterModules(modules, topics, "java", "").map(item => item.id)).toEqual(["core", "jvm"]);
    expect(filterModules(modules, topics, "java", "sql")).toEqual([]);
  });
  it("searches topic names and descriptions using real catalog fields", () => {
    expect(filterModules(modules, topics, "", "co so du lieu").map(item => item.id)).toEqual(["sql"]);
    expect(filterModules(modules, topics, "", "stack").map(item => item.id)).toEqual(["jvm"]);
  });
  it("returns an honest empty state and never mutates the source array", () => {
    const order = modules.map(item => item.id);
    expect(filterModules(modules, topics, "missing", "")).toEqual([]);
    filterModules(modules, topics, "", "");
    expect(modules.map(item => item.id)).toEqual(order);
  });
});

describe("content track grouping", () => {
  it("scopes modules and categories to one track", () => {
    expect(filterModulesByTrack(modules, topics, "aws", "").map(item => item.id)).toEqual(["s3"]);
    expect(groupModulesByTopic(filterModulesByTrack(modules, topics, "aws", ""), topics, "aws").map(group => group.topic.id)).toEqual(["aws-storage"]);
    expect(filterModulesByTrack(modules, topics, "", "").map(item => item.id)).toEqual(["s3", "core", "sql", "jvm"]);
  });
  it("groups by category in topic order and drops empty categories", () => {
    const groups = groupModulesByTopic(filterModules(modules, topics, "", ""), topics, "");
    expect(groups.map(group => [group.topic.name, group.modules.map(module => module.id)])).toEqual([
      ["Java", ["core", "jvm"]],
      ["Cơ sở dữ liệu", ["sql"]],
      ["AWS Storage", ["s3"]],
    ]);
    expect(groupModulesByTopic(filterModules(modules, topics, "", "sql"), topics, "").map(group => group.topic.id)).toEqual(["db"]);
  });
  it("keeps the preview row small enough for the 'xem thêm' affordance", () => {
    expect(TOPIC_PREVIEW_LIMIT).toBeGreaterThan(1);
    expect(TOPIC_PREVIEW_LIMIT).toBeLessThanOrEqual(4);
  });
});
