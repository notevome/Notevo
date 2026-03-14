"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import { Clock, FileText, FolderPlus, Star } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function RecentActivityList() {
  const User = useQuery(api.users.viewer);

  // Mock activity data
  const activities = [
    {
      id: "1",
      type: "note_created",
      title: "Project Kickoff Notes",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: "2",
      type: "workspace_created",
      title: "Marketing Strategy",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
      id: "3",
      type: "note_pinned",
      title: "Q3 Planning",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    },
    {
      id: "4",
      type: "note_created",
      title: "Team Meeting Notes",
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    },
    {
      id: "5",
      type: "workspace_created",
      title: "Personal Projects",
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    },
  ];

  // Function to format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  // Function to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "note_created":
        return <FileText className="h-4 w-4" />;
      case "workspace_created":
        return <FolderPlus className="h-4 w-4" />;
      case "note_pinned":
        return <Star className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Function to get description based on activity type
  const getActivityDescription = (type: string) => {
    switch (type) {
      case "note_created":
        return "Created a new note";
      case "workspace_created":
        return "Created a new workspace";
      case "note_pinned":
        return "Pinned a note";
      default:
        return "Performed an action";
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="rounded-full bg-muted p-2">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getActivityDescription(activity.type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
