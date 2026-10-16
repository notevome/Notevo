import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notebook, FileText, Pin, TrendingUp, Tag } from "lucide-react";
import { Table } from "../ui/table";

interface StatsRowProps {
  workspaceCount: number;
  notesCount: number;
  pinnedCount: number;
}

export function StatsRow({
  workspaceCount,
  notesCount,
  pinnedCount,
}: StatsRowProps) {
  // Calculate a mock growth percentage
  const growthPercent = Math.floor(notesCount * 15) + 5; // Random number between 5-20%

  const stats = [
    {
      title: "Folders",
      value: workspaceCount,
      icon: <Notebook className="h-4 w-4 text-brand_tertiary/70" />,
    },
    {
      title: "Total Documents",
      value: notesCount,
      icon: <FileText className="h-4 w-4 text-brand_tertiary/70" />,
    },
    {
      title: "Pinned Documents",
      value: pinnedCount,
      icon: <Pin className="h-4 w-4 text-brand_tertiary/70" />,
    },
    {
      title: "Growth",
      value: `${growthPercent}%`,
      icon: <TrendingUp className="h-4 w-4 text-brand_tertiary/70" />,
    },
  ];
  if (workspaceCount > 0 || pinnedCount > 0 || notesCount > 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {notesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {notesCount === 1 ? "Document" : "Documents"} in total
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Total Pages
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {notesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {notesCount === 1 ? "Page" : "Pages"} in total
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Total Tables
            </CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {notesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {notesCount === 1 ? "Table" : "Tables"} in total
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Total Tags
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {notesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {notesCount === 1 ? "Tag" : "Tags"} in total
            </p>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    return null;
  }
}
