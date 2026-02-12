import { useContentList, useCreateContent, useUnansweredList, useSyncFromSheet } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContentSchema, type InsertContent } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Extend schema for form validation
const formSchema = insertContentSchema.extend({
  keywords: z.string().transform(str => str.split(',').map(s => s.trim()).filter(Boolean))
});

type FormData = z.input<typeof formSchema>;

export default function Admin() {
  const { data: content, isLoading: contentLoading } = useContentList();
  const { data: unanswered, isLoading: unansweredLoading } = useUnansweredList();
  const createMutation = useCreateContent();
  const syncMutation = useSyncFromSheet();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast({
        title: "Sync Complete",
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Could not sync from Google Sheets",
        variant: "destructive",
      });
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "AI Skills",
      question: "",
      answer: "",
      keywords: "",
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      // TypeScript needs help here because the transform above changes the type
      // We need to pass the array of strings to the mutation
      const payload: InsertContent = {
        ...data,
        keywords: data.keywords as unknown as string[] 
      };
      
      await createMutation.mutateAsync(payload);
      toast({
        title: "Success",
        description: "Content created successfully",
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create content",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-display text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-500">Manage knowledge base and review questions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              data-testid="button-sync-sheets"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncMutation.isPending ? "Syncing..." : "Sync from Google Sheets"}
            </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-add-content">
                <Plus className="w-4 h-4" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Knowledge Base Item</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic</label>
                  <Select 
                    defaultValue="AI Skills" 
                    onValueChange={(val) => form.setValue("topic", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AI Skills">AI Skills</SelectItem>
                      <SelectItem value="Communication">Communication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Question</label>
                  <Input {...form.register("question")} placeholder="e.g. What is a neural network?" />
                  {form.formState.errors.question && (
                    <p className="text-xs text-red-500">{form.formState.errors.question.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Answer</label>
                  <Textarea 
                    {...form.register("answer")} 
                    placeholder="Enter the detailed answer..." 
                    className="h-32 resize-none"
                  />
                  {form.formState.errors.answer && (
                    <p className="text-xs text-red-500">{form.formState.errors.answer.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Keywords (comma separated)</label>
                  <Input {...form.register("keywords")} placeholder="neural, network, deep learning, AI" />
                  <p className="text-xs text-muted-foreground">Used for matching user questions</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Content"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="content">Knowledge Base</TabsTrigger>
            <TabsTrigger value="unanswered" className="relative">
              Unanswered Questions
              {unanswered && unanswered.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unanswered.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Content Library</CardTitle>
                <CardDescription>
                  Current questions and answers in the database.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Topic</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead>Keywords</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {content?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                {item.topic}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.question}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {item.keywords?.join(", ")}
                            </TableCell>
                            <TableCell>
                              {item.link ? (
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                                  <ExternalLink className="w-3 h-3" />
                                  View
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {content?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No content found. Add some knowledge!
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unanswered">
            <Card className="border-none shadow-md border-t-4 border-t-amber-400">
              <CardHeader>
                <CardTitle>Unanswered Questions</CardTitle>
                <CardDescription>
                  Questions the bot couldn't answer. Review and add to knowledge base.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unansweredLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Topic</TableHead>
                          <TableHead>Question Asked</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unanswered?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline">{item.topic}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.question}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(item.createdAt || "").toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => {
                                  setOpen(true);
                                  form.setValue("question", item.question);
                                  form.setValue("topic", item.topic);
                                }}
                              >
                                Answer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {unanswered?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12">
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                <p>All caught up! No unanswered questions.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
