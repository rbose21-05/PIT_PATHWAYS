"use client";

import { Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PathwayChips } from "@/components/pathway/chips";
import { PrereqTip } from "@/components/pathway/prereq-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BUCKETS, GEN_ED_CODES, type Bucket, type Course } from "@/lib/types";
import { COURSE_DRAG_TYPE, bucketMeta } from "@/lib/pathway";
import { cn } from "@/lib/utils";

const REQUIREMENT_ORDER = ["CS elective", "JYW", "IE"];

function courseFulfills(course: Course, requirement: string) {
  if ((GEN_ED_CODES as readonly string[]).includes(requirement)) {
    return course.genEd.includes(requirement);
  }
  return course.requirements.includes(requirement);
}

function requirementOptions(courses: Course[]) {
  const present = new Set<string>();
  for (const course of courses) {
    for (const code of course.genEd) present.add(code);
    for (const label of course.requirements) present.add(label);
  }
  const genEd = GEN_ED_CODES.filter((code) => present.has(code));
  const labels = [...present].filter((label) => !(GEN_ED_CODES as readonly string[]).includes(label));
  labels.sort((a, b) => {
    const aRank = REQUIREMENT_ORDER.indexOf(a);
    const bRank = REQUIREMENT_ORDER.indexOf(b);
    if (aRank !== -1 || bRank !== -1) {
      return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
    }
    return a.localeCompare(b);
  });
  return [...genEd, ...labels];
}

export function CourseSidebar({
  courses,
  onAdd,
  onEdit,
  onCreate,
}: {
  courses: Course[];
  onAdd: (course: Course, bucket: Bucket) => void;
  onEdit: (course: Course) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const normalized = query.trim().toLowerCase();
  const fulfills = useMemo(() => requirementOptions(courses), [courses]);
  const filtersOn = buckets.length > 0 || requirements.length > 0;

  function toggleBucket(bucket: Bucket) {
    setBuckets((current) =>
      current.includes(bucket) ? current.filter((item) => item !== bucket) : [...current, bucket],
    );
  }

  function toggleRequirement(requirement: string) {
    setRequirements((current) =>
      current.includes(requirement)
        ? current.filter((item) => item !== requirement)
        : [...current, requirement],
    );
  }

  const groups = useMemo(() => {
    const matches = (course: Course) => {
      if (buckets.length > 0 && !buckets.every((bucket) => course.buckets.includes(bucket))) return false;
      if (requirements.length > 0 && !requirements.every((requirement) => courseFulfills(course, requirement))) {
        return false;
      }
      if (!normalized) return true;
      const haystack = [course.number, course.title, ...course.genEd, ...course.requirements]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    };

    if (buckets.length > 1) {
      const matched = courses.filter(matches);
      return matched.length > 0 ? [{ key: buckets.join("|"), buckets, courses: matched }] : [];
    }

    const visibleBuckets = buckets.length === 1 ? buckets : [...BUCKETS];
    return visibleBuckets
      .map((bucket) => ({
        key: bucket,
        buckets: [bucket],
        courses: courses.filter((course) => course.buckets.includes(bucket) && matches(course)),
      }))
      .filter((group) => group.courses.length > 0);
  }, [buckets, courses, normalized, requirements]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-stone-200 p-2 pr-10 md:pr-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search courses"
          aria-label="Search courses"
        />
        <Button type="button" size="sm" onClick={onCreate}>
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-2 border-b border-stone-200 px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium tracking-wide text-stone-500">Bucket</p>
          {filtersOn ? (
            <button
              type="button"
              className="text-[11px] font-medium text-stone-500 underline-offset-2 hover:underline"
              onClick={() => {
                setBuckets([]);
                setRequirements([]);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {BUCKETS.map((bucket) => {
            const selected = buckets.includes(bucket);
            const meta = bucketMeta[bucket];
            return (
              <button
                key={bucket}
                type="button"
                aria-pressed={selected}
                className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                style={
                  selected
                    ? { background: meta.accent, borderColor: meta.accent, color: "white" }
                    : { borderColor: "#e7e5e4", color: meta.ink }
                }
                onClick={() => toggleBucket(bucket)}
              >
                {bucket}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] font-medium tracking-wide text-stone-500">Fulfills</p>
        <div className="flex flex-wrap gap-1">
          {fulfills.map((requirement) => {
            const selected = requirements.includes(requirement);
            return (
              <button
                key={requirement}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                  selected
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600",
                )}
                onClick={() => toggleRequirement(requirement)}
              >
                {requirement}
              </button>
            );
          })}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-2 pb-4">
          {groups.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-stone-500">
              {courses.length === 0 ? "No courses" : "No matching courses"}
            </p>
          ) : (
            groups.map((group) => {
              return (
                <section key={group.key}>
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-white/95 px-1 py-1.5 backdrop-blur-sm">
                    <span className="flex shrink-0 items-center gap-1">
                      {group.buckets.map((bucket) => (
                        <span
                          key={bucket}
                          className="size-2 rounded-full"
                          style={{ background: bucketMeta[bucket].accent }}
                        />
                      ))}
                    </span>
                    <h2 className="text-xs font-semibold tracking-wide text-stone-700">
                      {group.buckets.join(" + ")}
                    </h2>
                    <span className="text-xs text-stone-400">{group.courses.length}</span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {group.courses.map((course) => (
                      <li key={`${group.key}-${course.id}`}>
                        <PrereqTip prerequisites={course.prerequisites}>
                        <div className="flex items-start gap-1 rounded-lg px-1 py-1.5 hover:bg-stone-50">
                          <div
                            className="min-w-0 flex-1 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(COURSE_DRAG_TYPE, course.id);
                              event.dataTransfer.setData("text/plain", course.id);
                              event.dataTransfer.effectAllowed = "copy";
                            }}
                          >
                            <div className="font-mono text-[11px] leading-snug font-medium break-words text-stone-500">
                              {course.number}
                            </div>
                            <div className="text-[13px] leading-snug font-medium text-stone-900">
                              {course.title}
                            </div>
                            <div className="mt-1">
                              <PathwayChips genEd={course.genEd} requirements={course.requirements} />
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={`Add ${course.number} to the pathway`}
                              onClick={() =>
                                onAdd(
                                  course,
                                  group.buckets.find((bucket) => course.buckets.includes(bucket)) ??
                                    course.buckets[0],
                                )
                              }
                            >
                              <Plus />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Edit ${course.number}`}
                              onClick={() => onEdit(course)}
                            >
                              <Pencil />
                            </Button>
                          </div>
                        </div>
                        </PrereqTip>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
