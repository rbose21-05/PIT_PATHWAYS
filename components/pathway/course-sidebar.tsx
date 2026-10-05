"use client";

import { Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PathwayChips } from "@/components/pathway/chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BUCKETS, type Course } from "@/lib/types";
import { COURSE_DRAG_TYPE, bucketMeta } from "@/lib/pathway";

export function CourseSidebar({
  courses,
  onAdd,
  onEdit,
  onCreate,
}: {
  courses: Course[];
  onAdd: (course: Course) => void;
  onEdit: (course: Course) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const groups = useMemo(() => {
    return BUCKETS.map((bucket) => ({
      bucket,
      courses: courses.filter((course) => {
        if (!course.buckets.includes(bucket)) return false;
        if (!normalized) return true;
        const haystack = [course.number, course.title, ...course.genEd, ...course.requirements]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      }),
    })).filter((group) => group.courses.length > 0);
  }, [courses, normalized]);

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
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-2 pb-4">
          {groups.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-stone-500">
              {courses.length === 0 ? "No courses" : "No matching courses"}
            </p>
          ) : (
            groups.map((group) => {
              const meta = bucketMeta[group.bucket];
              return (
                <section key={group.bucket}>
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-white/95 px-1 py-1.5 backdrop-blur-sm">
                    <span className="size-2 rounded-full" style={{ background: meta.accent }} />
                    <h2 className="text-xs font-semibold tracking-wide text-stone-700">
                      {group.bucket}
                    </h2>
                    <span className="text-xs text-stone-400">{group.courses.length}</span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {group.courses.map((course) => (
                      <li key={`${group.bucket}-${course.id}`}>
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
                              onClick={() => onAdd(course)}
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
