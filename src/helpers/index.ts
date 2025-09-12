import type { LineItem } from "../types";

// Split line items into pages based on how many rows fit per page
export const paginateItems = (
  items: LineItem[],
  rowsPerFirstPage: number,
  rowsPerOtherPages: number
) => {
  const pages: LineItem[][] = [];
  let start = 0;

  // first page
  const firstEnd = Math.min(items.length, start + rowsPerFirstPage);
  pages.push(items.slice(start, firstEnd));
  start = firstEnd;

  // next pages
  while (start < items.length) {
    const end = Math.min(items.length, start + rowsPerOtherPages);
    pages.push(items.slice(start, end));
    start = end;
  }
  return pages;
};

// Random id
export const uid = () => Math.random().toString(36).slice(2, 9);
