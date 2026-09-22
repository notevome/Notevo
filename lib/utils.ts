import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ELLIPSIS = "...";
const TYPOGRAPHIC_ELLIPSIS = "…";
const EMAIL_DISPLAY_REGEX = /(.{3}).*?(@.{3}).*/;

const WORKSPACE_NAME_MAX_LENGTH = 50;
const CREATE_SIDEBAR_WORKSPACE_NAME_MAX_LENGTH = 18;
const USER_FIRST_NAME_MAX_LENGTH = 10;

type ResponsiveLength = {
  ssr: number;
  mobile: number;
  tablet: number;
  desktop: number;
};

const NOTE_TITLE_LENGTHS: ResponsiveLength = {
  ssr: 14,
  mobile: 23,
  tablet: 35,
  desktop: 60,
};

const TABLE_NAME_LENGTHS: ResponsiveLength = {
  ssr: 12,
  mobile: 10,
  tablet: 15,
  desktop: 20,
};

const truncateText = (value: string, maxLength: number, suffix = ELLIPSIS) => {
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}${suffix}`
    : value;
};

const getResponsiveMaxLength = (lengths: ResponsiveLength) => {
  if (typeof window === "undefined") return lengths.ssr;

  const width = window.innerWidth;

  if (width < 640) return lengths.mobile;
  if (width < 1024) return lengths.tablet;
  return lengths.desktop;
};

export const formatWorkspaceNameForCreateSideBarBtn = (name: string) =>
  truncateText(name, CREATE_SIDEBAR_WORKSPACE_NAME_MAX_LENGTH);

export const formatWorkspaceName = (name: string) =>
  truncateText(name, WORKSPACE_NAME_MAX_LENGTH);

export const formatUserName = (name: string | undefined) => {
  if (!name) return null;

  const nameParts = name.split(" ");
  const firstName = nameParts[0];
  const lastNameInitial = nameParts[1] ? ` ${nameParts[1].charAt(0)}.` : ".";

  return `${truncateText(firstName, USER_FIRST_NAME_MAX_LENGTH)}${lastNameInitial}`;
};

export const formatUserEmail = (email: string | undefined) =>
  email ? email.replace(EMAIL_DISPLAY_REGEX, "$1...$2") : "";

export const formatUserNoteTitle = (title: string) => {
  if (!title) return "";

  const maxLength = getResponsiveMaxLength(NOTE_TITLE_LENGTHS);
  return truncateText(title, maxLength, TYPOGRAPHIC_ELLIPSIS);
};

export const formatTableName = (tableName: string) => {
  if (!tableName) return "";

  const maxLength = getResponsiveMaxLength(TABLE_NAME_LENGTHS);
  return truncateText(tableName, maxLength);
};

export const formatNoteTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
