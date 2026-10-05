"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCsRequirement } from "@/lib/pathway";
import { BUCKETS, GEN_ED_CODES, type Bucket, type Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS = ["CS elective", "JYW", "IE"];

export type CourseDraft = {
  number: string;
  title: string;
  buckets: Bucket[];
  genEd: string[];
  requirements: string[];
};

export function CourseDialog({
  course,
  onClose,
  onSave,
  onRemove,
}: {
  course: Course | null;
  onClose: () => void;
  onSave: (draft: CourseDraft, course: Course | null) => void;
  onRemove: (course: Course) => void;
}) {
  const [number, setNumber] = useState(course?.number ?? "");
  const [title, setTitle] = useState(course?.title ?? "");
  const [buckets, setBuckets] = useState<Bucket[]>(course?.buckets ?? []);
  const [genEd, setGenEd] = useState<string[]>(course?.genEd ?? []);
  const [requirements, setRequirements] = useState<string[]>(course?.requirements ?? []);
  const [requirementDraft, setRequirementDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function toggleBucket(bucket: Bucket) {
    setBuckets((current) =>
      current.includes(bucket) ? current.filter((item) => item !== bucket) : [...current, bucket],
    );
  }

  function toggleGenEd(code: string) {
    setGenEd((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  function addRequirement(label: string) {
    const next = label.trim();
    if (!next) return;
    setRequirements((current) => (current.includes(next) ? current : [...current, next]));
    setRequirementDraft("");
  }

  function save() {
    if (!number.trim()) {
      setError("Enter a course number.");
      return;
    }
    if (!title.trim()) {
      setError("Enter a course name.");
      return;
    }
    if (buckets.length === 0) {
      setError("Choose at least one bucket.");
      return;
    }
    const orderedBuckets = BUCKETS.filter((bucket) => buckets.includes(bucket));
    const orderedGenEd = GEN_ED_CODES.filter((code) => genEd.includes(code));
    onSave(
      {
        number: number.trim(),
        title: title.trim(),
        buckets: orderedBuckets,
        genEd: [...orderedGenEd],
        requirements,
      },
      course,
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{course ? "Edit course" : "Add course"}</DialogTitle>
          <DialogDescription className="sr-only">
            Course number, name, buckets, gen ed, and requirements.
          </DialogDescription>
        </DialogHeader>

        {confirmRemove && course ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-stone-700">
              Remove {course.number} from the course list and the pathway?
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmRemove(false)}>
                Back
              </Button>
              <Button type="button" variant="destructive" onClick={() => onRemove(course)}>
                Remove
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-number">Number</Label>
              <Input
                id="course-number"
                value={number}
                autoComplete="off"
                onChange={(event) => setNumber(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-name">Name</Label>
              <Input
                id="course-name"
                value={title}
                autoComplete="off"
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Buckets</legend>
              <div className="flex flex-col gap-1.5">
                {BUCKETS.map((bucket) => {
                  const checked = buckets.includes(bucket);
                  return (
                    <button
                      key={bucket}
                      type="button"
                      aria-pressed={checked}
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-stone-50"
                      onClick={() => toggleBucket(bucket)}
                    >
                      <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                      {bucket}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Gen Ed</legend>
              <div className="flex flex-wrap gap-1.5">
                {GEN_ED_CODES.map((code) => {
                  const checked = genEd.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={checked}
                      className="flex items-center gap-1.5 rounded-md px-1 py-1 text-sm hover:bg-stone-50"
                      onClick={() => toggleGenEd(code)}
                    >
                      <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                      {code}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <Label htmlFor="course-requirement">Requirements</Label>
              {requirements.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {requirements.map((label) => (
                    <span
                      key={label}
                      className={cn(
                        "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium",
                        isCsRequirement(label)
                          ? "bg-[#1e3a5f] text-white"
                          : "border border-stone-300 bg-white text-stone-700",
                      )}
                    >
                      {label}
                      <button
                        type="button"
                        aria-label={`Remove ${label}`}
                        className="rounded-sm opacity-80 hover:opacity-100"
                        onClick={() =>
                          setRequirements((current) => current.filter((item) => item !== label))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <Input
                  id="course-requirement"
                  value={requirementDraft}
                  placeholder="Add a label"
                  onChange={(event) => setRequirementDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addRequirement(requirementDraft);
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addRequirement(requirementDraft)}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => addRequirement(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="sm:items-center">
              {course ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
