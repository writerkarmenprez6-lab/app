export interface Chapter {
  title: string;
  content: string;
}

export interface Book {
  title: string;
  author: string;
  language: string;
  summary: string;
  chapters: Chapter[];
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  READING = 'READING',
  ERROR = 'ERROR'
}

export interface ProcessingStatus {
  step: string;
  progress: number;
}

export interface Highlight {
  id: string;
  chapterIndex: number;
  text: string; // The selected text string to highlight
  color: 'yellow' | 'green' | 'blue' | 'pink';
  date: number;
}

export interface Bookmark {
  chapterIndex: number;
  timestamp: number;
}

export interface UserBookData {
  bookmarks: Bookmark[];
  highlights: Highlight[];
  lastReadChapter: number;
  scrollPosition: number;
}
