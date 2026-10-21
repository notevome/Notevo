"use client";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { parseSlug } from "@/lib/parseSlug";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMediaQuery } from "react-responsive";

export default function BreadcrumbWithCustomSeparator() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);

  const isMobile = useMediaQuery({ maxWidth: 640 });
  const isTabletAir_horizontal = useMediaQuery({ maxWidth: 1180 });
  const isTabletPro_horizontal = useMediaQuery({ maxWidth: 1366 });

  const homeIndex = pathSegments.findIndex((segment) => segment === "home");
  const rawWorkingSpaceId =
    homeIndex >= 0 && pathSegments.length > homeIndex + 1
      ? pathSegments[homeIndex + 1]
      : null;
  const isValidWorkspaceId =
    rawWorkingSpaceId &&
    rawWorkingSpaceId !== "undefined" &&
    rawWorkingSpaceId !== "null";
  const workingSpaceId: Id<"folders"> | null = isValidWorkspaceId
    ? (rawWorkingSpaceId as Id<"folders">)
    : null;

  const workspaceData = useQuery(api.folders.getRecentFolders);
  const singleFolder = useQuery(
    api.folders.getFolderById,
    workingSpaceId ? { _id: workingSpaceId } : "skip",
  );
  const workspaceDatafilter =
    workingSpaceId && workspaceData
      ? workspaceData.find(
          (workspaceDatafiltered: any) =>
            workspaceDatafiltered._id === workingSpaceId,
        )
      : null;
  const workspaceName =
    workspaceDatafilter?.name ?? (singleFolder as any)?.name;

  const getTruncatedName = (name: string) => {
    if (isMobile) {
      return name.length > 10 ? `${name.slice(0, 12)}...` : name;
    } else if (isTabletAir_horizontal) {
      return name.length > 15 ? `${name.slice(0, 15)}...` : name;
    } else if (isTabletPro_horizontal) {
      return name.length > 20 ? `${name.slice(0, 35)}...` : name;
    }
    return name.length > 35 ? `${name.slice(0, 45)}...` : name;
  };

  return (
    <Breadcrumb className=" *:select-none w-full">
      <BreadcrumbList className="flex flex-nowrap overflow-hidden whitespace-nowrap text-primary !gap-0.5 scrollbar-none">
        {pathSegments.map((segment, index) => {
          const pathToSegment =
            "/" + pathSegments.slice(0, index + 1).join("/");
          const isLast = index === pathSegments.length - 1;

          let displayName;

          if (index === homeIndex + 1) {
            if (workspaceName) {
              displayName = workspaceName;
            } else if (segment === "undefined" || segment === "null") {
              displayName = "Workspace";
            } else {
              displayName = parseSlug(segment);
            }
          } else if (segment.toLowerCase() === "pdf") {
            displayName = "PDF";
          } else if (segment === "undefined" || segment === "null") {
            displayName = "Document";
          } else {
            displayName = parseSlug(segment);
          }

          displayName = getTruncatedName(displayName);

          return (
            <div
              key={pathToSegment}
              className="flex items-center justify-start flex-shrink-0"
            >
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-primary">
                    {displayName}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <IntentPrefetchLink
                      href={pathToSegment}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {displayName}
                    </IntentPrefetchLink>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 mx-1 mt-px text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
