import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
const getMaxTitleLength = () => {
  if (typeof window === "undefined") return 12; // SSR safety

  const width = window.innerWidth;

  if (width < 640) return 23; // mobile
  if (width < 1024) return 35; // tablet
  return 60; // desktop
};
const getMaxTableNameLength = () => {
  if (typeof window === "undefined") return 12; // SSR safety

  const width = window.innerWidth;

  if (width < 640) return 10; // mobile
  if (width < 1024) return 15; // tablet
  return 20; // desktop
};
const MAX_NAME_LENGTH = 50;
const EMAIL_DISPLAY_REGEX = /(.{3}).*?(@.{3}).*/;
export const formatWorkspaceName = (name: string) =>
  name.length > MAX_NAME_LENGTH
    ? `${name.substring(0, MAX_NAME_LENGTH)}...`
    : name;

export const formatUserName = (name: string | undefined) => {
  if (!name) return null;

  const nameParts = name.split(" ");
  const firstName = nameParts[0];
  const lastNameInitial = nameParts[1] ? ` ${nameParts[1].charAt(0)}.` : ".";

  return `${firstName.length > 10 ? `${firstName.substring(0, 10)}...` : firstName}${lastNameInitial}`;
};

export const formatUserEmail = (email: string | undefined) =>
  email ? email.replace(EMAIL_DISPLAY_REGEX, "$1...$2") : "";

export const formatUserNoteTitle = (title: string) => {
  if (!title) return "";

  const max = getMaxTitleLength();
  return title.length > max ? `${title.slice(0, max)}…` : title;
};

export const formatTableName = (TableName: string) => {
  if (!TableName) return;
  const max = getMaxTableNameLength();
  return TableName.length > max ? `${TableName.slice(0, max)}...` : TableName;
};

export const formatNoteTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
