import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import SkeletonTextAnimation from "../ui/SkeletonTextAnimation";
import SkeletonSmImgAnimation from "../ui/SkeletonSmImgAnimation";
import SkeletonTextAndIconAnimation from "../ui/SkeletonTextAndIconAnimation";

export default function SkeletonSidebar({
  sidebarWidth,
  open,
}: {
  sidebarWidth: number;
  open: boolean;
}) {
  return (
    <Sidebar
      variant="inset"
      className="group bg-muted"
      style={{
        width: `${sidebarWidth}px`,
      }}
    >
      <SidebarHeader className=" text-foreground border-b border-border">
        <div className=" w-full flex items-center justify-between p-1.5">
          <div className="flex items-center justify-start gap-2">
            {open ? (
              <>
                <SkeletonTextAnimation className="w-20 h-4 mx-0" />
                <SkeletonTextAnimation className="w-8 h-3 mx-0" />
              </>
            ) : (
              <SkeletonSmImgAnimation className="h-6 w-6" />
            )}
          </div>
          <SkeletonTextAnimation className="w-full mx-0 h-6" />
        </div>
        <div className="my-1">
          {open ? (
            <SkeletonTextAnimation className="w-full mx-0 h-8" />
          ) : (
            <SkeletonTextAnimation className="w-8 mx-0 h-8" />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="text-foreground transition-all duration-200 ease-in-out scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent group-hover:scrollbar-thumb-primary/20">
        <SidebarGroup>
          <SidebarGroupLabel className="text-border">
            <SkeletonTextAnimation className="w-24 h-3" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-border">
            <SkeletonTextAnimation className="w-24 h-3" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="text-foreground">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="my-2">
              <div className="border-none w-full h-15 flex items-center justify-between">
                <SkeletonSmImgAnimation className="h-8 w-8" />
                {open ? (
                  <div className="flex flex-col items-start justify-center">
                    <SkeletonTextAnimation className="w-28 h-4 mx-0" />
                    <SkeletonTextAnimation className="w-20 h-3 mt-1 mx-0" />
                  </div>
                ) : null}
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
