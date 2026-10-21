export interface MarkdownUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface GuidebookTopicRow {
  id: string;
  title: string;
  slug: string;
  position: number;
  summary: string | null;
  objectKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuidebookTopicListItem {
  id: string;
  title: string;
  slug: string;
  position: number;
  summary: string | null;
  updatedAt: Date;
}
