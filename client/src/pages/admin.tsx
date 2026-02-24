import { useContentByTopic, useUnansweredList, useUploadJSON, useTopics } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, ExternalLink, Globe, Users, Download, Upload, Database, FileJson } from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/i18n";

export default function Admin() {
  const { data: topics, isLoading: topicsLoading } = useTopics();
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const { data: topicContent, isLoading: contentLoading } = useContentByTopic(selectedTopic);
  const { data: unanswered, isLoading: unansweredLoading } = useUnansweredList();
  const { data: usersList, isLoading: usersLoading } = useQuery<Array<{
    id: string; email: string | null; firstName: string | null; lastName: string | null;
    createdAt: string | null; questionCounts: Record<string, number>;
  }>>({ queryKey: ["/api/admin/users"] });
  const uploadMutation = useUploadJSON();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast({ title: t.admin.error, description: t.admin.invalidFileType, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const result = await uploadMutation.mutateAsync(file);
      toast({
        title: t.admin.success,
        description: result.message,
      });
      setSelectedTopic(result.topic);
    } catch (error: any) {
      toast({
        title: t.admin.uploadFailed,
        description: error.message || t.admin.uploadError,
        variant: "destructive",
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/users/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t.admin.error, description: "Export failed", variant: "destructive" });
    }
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="rounded-full shrink-0" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900" data-testid="text-admin-title">{t.admin.dashboard}</h1>
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
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="pt-BR">PT</SelectItem>
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-file-upload"
            />
            <Button
              variant="default"
              size="sm"
              className="gap-2 text-xs sm:text-sm shadow-lg shadow-primary/20"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              data-testid="button-upload-json"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadMutation.isPending ? t.admin.uploading : t.admin.uploadJSON}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="knowledge" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6 sm:mb-8">
            <TabsTrigger value="knowledge" className="text-xs sm:text-sm" data-testid="tab-knowledge">
              <Database className="w-3.5 h-3.5 mr-1" />
              {t.admin.knowledgeBase}
            </TabsTrigger>
            <TabsTrigger value="unanswered" className="relative text-xs sm:text-sm" data-testid="tab-unanswered">
              {t.admin.unanswered}
              {unanswered && unanswered.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unanswered.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm" data-testid="tab-users">
              <Users className="w-3.5 h-3.5 mr-1" />
              {t.admin.users}
              {usersList && usersList.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{usersList.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge">
            <Card className="border-none shadow-md">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">{t.admin.contentLibrary}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {t.admin.contentDesc}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {topics && topics.length > 0 && (
                      <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                        <SelectTrigger className="w-[200px]" data-testid="select-admin-topic">
                          <SelectValue placeholder={t.admin.selectTopic} />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic} value={topic} data-testid={`option-topic-${topic}`}>
                              {topic}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {topicsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : !topics || topics.length === 0 ? (
                  <div className="text-center py-12">
                    <FileJson className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm mb-2" data-testid="text-no-topics">{t.admin.noTopics}</p>
                    <p className="text-muted-foreground text-xs">{t.admin.uploadHint}</p>
                  </div>
                ) : !selectedTopic ? (
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">{t.admin.selectTopicHint}</p>
                  </div>
                ) : contentLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      <Badge variant="secondary" data-testid="badge-topic-count">
                        {selectedTopic}: {(topicContent as any[])?.length || 0} {t.admin.entries}
                      </Badge>
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[80px]">Unit ID</TableHead>
                            <TableHead className="min-w-[200px]">{t.admin.subtopic}</TableHead>
                            <TableHead className="min-w-[150px]">{t.admin.keywords}</TableHead>
                            <TableHead className="min-w-[250px]">{t.admin.keyTakeaway}</TableHead>
                            <TableHead className="min-w-[100px]">{t.admin.difficulty}</TableHead>
                            <TableHead className="min-w-[80px]">{t.admin.link}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topicContent?.map((item) => (
                            <TableRow key={item.id} data-testid={`row-content-${item.id}`}>
                              <TableCell className="text-xs font-mono text-muted-foreground">{item.unitId || "-"}</TableCell>
                              <TableCell className="text-sm font-medium max-w-[300px]">
                                <div className="line-clamp-2">{item.subtopic}</div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                <div className="line-clamp-2">{item.keywords || "-"}</div>
                              </TableCell>
                              <TableCell className="text-xs max-w-[300px]">
                                <div className="line-clamp-3">{item.keyTakeaway || "-"}</div>
                              </TableCell>
                              <TableCell>
                                {item.difficulty && (
                                  <Badge variant={
                                    item.difficulty === "Beginner" ? "secondary" :
                                    item.difficulty === "Advanced" ? "destructive" : "outline"
                                  } className="text-[10px]">
                                    {item.difficulty}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.timestampLink ? (
                                  <a href={item.timestampLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs" data-testid={`link-content-${item.id}`}>
                                    <ExternalLink className="w-3 h-3" />
                                    {t.admin.view}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!topicContent || topicContent.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                {t.admin.noContent}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unanswered?.map((item) => (
                            <TableRow key={item.id} data-testid={`row-unanswered-${item.id}`}>
                              <TableCell>
                                <Badge variant="outline">{item.topic}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{item.question}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(item.createdAt || "").toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!unanswered || unanswered.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-12">
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
                        </div>
                      ))}
                      {(!unanswered || unanswered.length === 0) && (
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

          <TabsContent value="users">
            <Card className="border-none shadow-md">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">{t.admin.usersTitle}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {t.admin.usersDesc}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs sm:text-sm"
                    onClick={handleExport}
                    disabled={exporting || !usersList?.length}
                    data-testid="button-export-users"
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {exporting ? t.admin.exporting : t.admin.exportExcel}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {usersLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {usersList && usersList.length > 0 && (
                      <div className="mb-4">
                        <Badge variant="secondary">{t.admin.totalUsers}: {usersList.length}</Badge>
                      </div>
                    )}
                    <div className="hidden sm:block rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.admin.userName}</TableHead>
                            <TableHead>{t.admin.userEmail}</TableHead>
                            {topics?.map((topic) => (
                              <TableHead key={topic} className="text-center">{topic} Qs</TableHead>
                            ))}
                            <TableHead>{t.admin.registered}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersList?.map((user) => (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                              <TableCell className="font-medium">
                                {`${user.firstName || ""} ${user.lastName || ""}`.trim() || "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{user.email || "-"}</TableCell>
                              {topics?.map((topic) => (
                                <TableCell key={topic} className="text-center">
                                  <Badge variant="secondary" className="text-xs">
                                    {user.questionCounts?.[topic] || 0}
                                  </Badge>
                                </TableCell>
                              ))}
                              <TableCell className="text-muted-foreground text-sm">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!usersList || usersList.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={(topics?.length || 0) + 3} className="text-center py-12 text-muted-foreground">
                                {t.admin.noUsers}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="sm:hidden space-y-3">
                      {usersList?.map((user) => (
                        <div key={user.id} className="bg-white rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">
                              {`${user.firstName || ""} ${user.lastName || ""}`.trim() || "-"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{user.email || "-"}</p>
                          <div className="flex gap-2 flex-wrap">
                            {topics?.map((topic) => (
                              <Badge key={topic} variant="secondary" className="text-[10px]">
                                {topic}: {user.questionCounts?.[topic] || 0}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {(!usersList || usersList.length === 0) && (
                        <p className="text-center py-8 text-muted-foreground text-sm">{t.admin.noUsers}</p>
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
