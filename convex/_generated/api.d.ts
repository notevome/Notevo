/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendMagicLink from "../ResendMagicLink.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as notes from "../notes.js";
import type * as notesTables from "../notesTables.js";
import type * as otp_ResendOTP from "../otp/ResendOTP.js";
import type * as otp_VerificationCodeEmail from "../otp/VerificationCodeEmail.js";
import type * as pdfs from "../pdfs.js";
import type * as users from "../users.js";
import type * as workingSpaces from "../workingSpaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendMagicLink: typeof ResendMagicLink;
  auth: typeof auth;
  http: typeof http;
  messages: typeof messages;
  notes: typeof notes;
  notesTables: typeof notesTables;
  "otp/ResendOTP": typeof otp_ResendOTP;
  "otp/VerificationCodeEmail": typeof otp_VerificationCodeEmail;
  pdfs: typeof pdfs;
  users: typeof users;
  workingSpaces: typeof workingSpaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
