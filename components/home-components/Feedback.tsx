"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { MessageCircleHeart } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  feedback: z.string().min(5, {
    message: "Feedback must be at least 5 characters.",
  }),
  name: z.string().optional(),
  email: z
    .string()
    .email({ message: "Invalid email address." })
    .optional()
    .or(z.literal("")),
});

export default function Feedback() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      feedback: "",
      name: "",
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await fetch("https://projectplannerai.com/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: "j57bg98tbw677pxbg4cgzgm81d7eatzs",
          feedback: values.feedback,
          name: values.name,
          email: values.email,
          label: "featureRequest",
        }),
      });
      setSubmitted(true);
      form.reset();
    } catch (e) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="SidebarMenuButton"
          className="group flex h-8 w-full min-w-0 items-center justify-start gap-0 px-2 text-sm font-normal text-foreground "
        >
          <MessageCircleHeart
            size="16"
            className="mr-2 h-4 w-4 text-muted-foreground"
          />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Send Feedback</DialogTitle>
        <DialogDescription className="sr-only">
          Share feedback, feature requests, or suggestions about Notevo.
        </DialogDescription>
        {submitted ? (
          <div className="py-6 text-center text-green-600 font-medium">
            Thank you for your feedback!
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Your feedback..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Please let us know your thoughts or suggestions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="or Github username (optional if you want a shoutout)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className=" pb-6 relative">
                <Button
                  className=" absolute -bottom-6 -right-6 before:bg-gradient-to-br before:from-primary/60 before:via-transparent before:to-transparent"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Submit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
