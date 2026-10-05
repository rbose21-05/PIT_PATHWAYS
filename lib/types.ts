export const BUCKETS = [
  "Public Interest",
  "Social Governance",
  "Digital Technology",
] as const;

export type Bucket = (typeof BUCKETS)[number];

export const GEN_ED_CODES = ["SB", "DG", "DU", "AT", "HS", "R2"] as const;

export type GenEdCode = (typeof GEN_ED_CODES)[number];

export type Course = {
  id: string;
  number: string;
  title: string;
  credits: number | null;
  description: string;
  prerequisites: string;
  enrollment: string;
  buckets: Bucket[];
  genEd: string[];
  requirements: string[];
  verified: boolean;
  unverifiedReason?: string;
};

export type RootNodeData = {
  number: string;
  label: string;
  genEd: string[];
};

export type BucketNodeData = {
  bucket: Bucket;
  label: string;
};

export type CourseNodeData = {
  courseId: string;
  number: string;
  label: string;
  genEd: string[];
  requirements: string[];
};

export type EdgeLabelData = {
  label: string;
};
