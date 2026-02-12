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
import { Loader2, Plus, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContentSchema, type InsertContent } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/i18n";

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
  const { language, setLanguage, t } = useLanguage();

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast({
        title: t.admin.syncComplete,
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: t.admin.syncFailed,
        description: error.message || t.admin.syncError,
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
      const payload: InsertContent = {
        ...data,
        keywords: data.keywords as unknown as string[] 
      };
      
      await createMutation.mutateAsync(payload);
      toast({
        title: t.admin.success,
        description: t.admin.contentCreated,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: t.admin.error,
        description: t.admin.createFailed,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="rounded-full shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900">{t.admin.dashboard}</h1>
              <p className="text-sm text-slate-500">{t.admin.manageKB}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-12 sm:pl-0">
            <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
              <SelectTrigger className="w-auto gap-1 border-none bg-transparent text-muted-foreground text-xs sm:text-sm" data-testid="select-language-admin">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt-BR">Português</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 text-xs sm:text-sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              data-testid="button-sync-sheets"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncMutation.isPending ? t.admin.syncing : t.admin.syncSheets}
            </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/20 text-xs sm:text-sm" data-testid="button-add-content">
                <Plus className="w-4 h-4" />
                {t.admin.addContent}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t.admin.addKBItem}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.admin.topic}</label>
                  <Select 
                    defaultValue="AI Skills" 
                    onValueChange={(val) => form.setValue("topic", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.selectTopic} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AI Skills">AI Skills</SelectItem>
                      <SelectItem value="Communication">Communication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.admin.question}</label>
                  <Input {...form.register("question")} placeholder={t.admin.questionPlaceholder} />
                  {form.formState.errors.question && (
                    <p className="text-xs text-red-500">{form.formState.errors.question.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.admin.answerLabel}</label>
                  <Textarea 
                    {...form.register("answer")} 
                    placeholder={t.admin.answerPlaceholder} 
                    className="h-32 resize-none"
                  />
                  {form.formState.errors.answer && (
                    <p className="text-xs text-red-500">{form.formState.errors.answer.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.admin.keywordsLabel}</label>
                  <Input {...form.register("keywords")} placeholder={t.admin.keywordsPlaceholder} />
                  <p className="text-xs text-muted-foreground">{t.admin.keywordsHelp}</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.admin.cancel}</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? t.admin.creating : t.admin.createContent}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 sm:mb-8">
            <TabsTrigger value="content" className="text-xs sm:text-sm">{t.admin.knowledgeBase}</TabsTrigger>
            <TabsTrigger value="unanswered" className="relative text-xs sm:text-sm">
              {t.admin.unanswered}
              {unanswered && unanswered.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unanswered.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="border-none shadow-md">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">{t.admin.contentLibrary}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t.admin.contentDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {contentLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="hidden sm:block rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.admin.topic}</TableHead>
                            <TableHead>{t.admin.question}</TableHead>
                            <TableHead>{t.admin.keywords}</TableHead>
                            <TableHead>{t.admin.link}</TableHead>
                            <TableHead className="w-[100px]">{t.admin.status}</TableHead>
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
                                    {t.admin.view}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {t.admin.active}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {content?.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {t.admin.noContent}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="sm:hidden space-y-3">
                      {content?.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                              {item.topic}
                            </Badge>
                            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              {t.admin.active}
                            </div>
                          </div>
                          <p className="text-sm font-medium">{item.question}</p>
                          {item.keywords && item.keywords.length > 0 && (
                            <p className="text-xs text-muted-foreground">{item.keywords.join(", ")}</p>
                          )}
                          {item.link && (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                              <ExternalLink className="w-3 h-3" />
                              {t.admin.viewLink}
                            </a>
                          )}
                        </div>
                      ))}
                      {content?.length === 0 && (
                        <p className="text-center py-8 text-muted-foreground text-sm">{t.admin.noContent}</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unanswered">
            <Card className="border-none shadow-md">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">{t.admin.unansweredQuestions}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t.admin.unansweredDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {unansweredLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="hidden sm:block rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.admin.topic}</TableHead>
                            <TableHead>{t.admin.questionAsked}</TableHead>
                            <TableHead>{t.admin.date}</TableHead>
                            <TableHead className="text-right">{t.admin.action}</TableHead>
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
                                  {t.admin.answer}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {unanswered?.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-12">
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                                  <p>{t.admin.allCaughtUp}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="sm:hidden space-y-3">
                      {unanswered?.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{item.topic}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.createdAt || "").toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{item.question}</p>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                              setOpen(true);
                              form.setValue("question", item.question);
                              form.setValue("topic", item.topic);
                            }}
                          >
                            {t.admin.answer}
                          </Button>
                        </div>
                      ))}
                      {unanswered?.length === 0 && (
                        <div className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            <p className="text-sm">{t.admin.allCaughtUp}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
