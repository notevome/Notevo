"use client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, FolderPlus, Search, Star } from "lucide-react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Table, Tag } from "lucide-react";

interface QuickActionsProps {
  onCreateWorkspace: () => void;
  loading: boolean;
}

export function QuickActions({
  onCreateWorkspace,
  loading,
}: QuickActionsProps) {
  const actions = [
    {
      title: "New Workspace",
      description: "Create a new workspace",
      icon: <FolderPlus className="h-5 w-5" />,
      onClick: onCreateWorkspace,
      loading: loading,
    },
    {
      title: "New Note",
      description: "Create a new note",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => {},
    },
    {
      title: "Search",
      description: "Search your notes",
      icon: <Search className="h-5 w-5" />,
      onClick: () => {},
    },
    {
      title: "Favorites",
      description: "View pinned notes",
      icon: <Star className="h-5 w-5" />,
      onClick: () => {},
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Button variant="outline" className="w-full justify-start">
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Table className="mr-2 h-4 w-4" />
              New Table
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Tag className="mr-2 h-4 w-4" />
              New Tag
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {actions.map((action, index) => (
          <Card
            key={index}
            className="bg-brand_fourthary/30 border-brand_tertiary/20 hover:border-brand_tertiary/40 transition-all duration-300 hover:shadow-md cursor-pointer group"
            onClick={action.onClick}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 app-radius-full bg-brand_tertiary/5 flex items-center justify-center group-hover:bg-brand_tertiary/10 transition-colors">
                {action.loading ? <LoadingAnimation /> : action.icon}
              </div>
              <div>
                <h3 className="font-medium text-brand_tertiary/90">
                  {action.title}
                </h3>
                <p className="text-xs text-brand_tertiary/60">
                  {action.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
