import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Paperclip, X } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TicketRichTextEditor } from "@/components/tickets/TicketRichTextEditor";
import { AssetTagSelect } from "@/components/assets/AssetTagSelect";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { titleCaseUi } from "@/lib/titleCaseUi";

const priorities = ["low", "normal", "high", "urgent"] as const;

const formSchema = z.object({
  categoryId: z.string().min(1, "Category Is Required"),
  title: z.string().min(1, "Title Is Required").max(500),
  descriptionHtml: z.string(),
  priority: z.enum(priorities),
  locationId: z.string().optional(),
  relatedIncidentId: z.string().optional(),
  assetId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type CreatePayload = { values: FormValues; files: File[] };

type ActiveTicketHit = {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  categoryName: string;
};

export default function TicketNewPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateHits, setDuplicateHits] = useState<ActiveTicketHit[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<CreatePayload | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/ticket-categories"],
    queryFn: async () => {
      const res = await fetch("/api/ticket-categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed To Load Categories");
      return res.json() as Promise<Array<{ id: string; name: string }>>;
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<Array<{ id: string; locationName: string }>>;
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["/api/incident-reports"],
    queryFn: async () => {
      const res = await fetch("/api/incident-reports", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<Array<{ id: string; incidentType?: string; incidentLocation?: string }>>;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: "",
      title: "",
      descriptionHtml: "",
      priority: "normal",
      locationId: "",
      relatedIncidentId: "",
      assetId: "",
    },
  });

  useEffect(() => {
    const first = categories[0]?.id;
    if (first && !form.getValues("categoryId")) {
      form.setValue("categoryId", first);
    }
  }, [categories, form]);

  const createMutation = useMutation({
    mutationFn: async ({ values, files }: CreatePayload) => {
      const payload = {
        categoryId: values.categoryId,
        title: values.title.trim(),
        descriptionHtml: values.descriptionHtml,
        priority: values.priority,
        locationId:
          values.locationId && values.locationId !== "__none__" ? values.locationId : null,
        relatedIncidentId:
          values.relatedIncidentId && values.relatedIncidentId !== "__none__"
            ? values.relatedIncidentId
            : null,
        assetId: values.assetId?.trim() || null,
      };
      const res = await apiRequest("POST", "/api/tickets", payload);
      const data = (await res.json()) as { id: string };
      let anyLocal = false;
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch(`/api/tickets/${data.id}/attachments`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!up.ok) throw new Error(await up.text());
        const body = (await up.json()) as { storageBackend?: string };
        if (body.storageBackend === "local") anyLocal = true;
      }
      return { ...data, anyAttachmentLocal: anyLocal };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setPendingFiles([]);
      setPendingSubmit(null);
      setDuplicateOpen(false);
      if (data.anyAttachmentLocal) {
        toast({
          title: "Ticket Created",
          description:
            "One or more attachments were saved on the server disk only (cloud upload failed). Check BLOB_READ_WRITE_TOKEN and server logs.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Ticket Created" });
      }
      navigate(`/tickets/${data.id}`);
    },
    onError: (e: Error) =>
      toast({
        title: "Could Not Create Ticket",
        description: e.message,
        variant: "destructive",
      }),
  });

  async function submitWithDuplicateCheck(values: FormValues) {
    const payload: CreatePayload = { values, files: pendingFiles };
    setCheckingDuplicates(true);
    try {
      const res = await fetch(
        `/api/tickets/active-in-category?categoryId=${encodeURIComponent(values.categoryId)}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        createMutation.mutate(payload);
        return;
      }
      const hits = (await res.json()) as ActiveTicketHit[];
      if (hits.length > 0) {
        setDuplicateHits(hits);
        setPendingSubmit(payload);
        setDuplicateOpen(true);
        return;
      }
      createMutation.mutate(payload);
    } catch {
      createMutation.mutate(payload);
    } finally {
      setCheckingDuplicates(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-screen">
      <div className="mx-auto w-full max-w-3xl">
        <Button variant="ghost" className="mb-4 -ml-2 text-uventorybiz-navy" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back To Tickets
          </Link>
        </Button>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">New Ticket</h2>
          <p className="text-uventorybiz-gray mt-1">
            Describe the issue clearly. Regulated safety incidents should use the Incidents module;
            you may link an existing incident below when relevant.
          </p>
        </div>
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
            <CardDescription>Category, Priority, Location, And Description.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => void submitWithDuplicateCheck(v))}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Short Summary" className="bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorities.map((p) => (
                            <SelectItem key={p} value={p}>
                              {titleCaseUi(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Where It Applies" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.locationName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="relatedIncidentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Incident (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Link Formal Incident" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {incidents.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {titleCaseUi(i.incidentType || "incident")} ·{" "}
                              {(i.incidentLocation || i.id).slice(0, 48)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset (Optional)</FormLabel>
                      <FormControl>
                        <AssetTagSelect
                          value={field.value || null}
                          onChange={(id) => field.onChange(id ?? "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descriptionHtml"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <TicketRichTextEditor
                          id="new-ticket-desc"
                          value={field.value}
                          onChange={field.onChange}
                          minHeight={320}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 shrink-0" />
                    Attachments (Optional)
                  </FormLabel>
                  <p className="text-sm text-uventorybiz-gray">
                    Images, PDF, Or Word — Uploaded After The Ticket Is Created.
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    className="text-sm w-full max-w-md"
                    onChange={(e) => {
                      const list = e.target.files;
                      if (list?.length) {
                        setPendingFiles((prev) => [...prev, ...Array.from(list)]);
                      }
                      e.target.value = "";
                    }}
                  />
                  {pendingFiles.length > 0 && (
                    <ul className="text-sm space-y-1 border border-gray-200 rounded-md p-2 bg-gray-50">
                      {pendingFiles.map((f, i) => (
                        <li key={`${f.name}-${i}-${f.size}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{f.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 shrink-0 text-gray-700 hover:bg-gray-200"
                            onClick={() =>
                              setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            aria-label={`Remove ${f.name}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || checkingDuplicates}
                  className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
                >
                  {createMutation.isPending || checkingDuplicates ? "Submitting…" : "Submit Ticket"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={duplicateOpen}
        onOpenChange={(open) => {
          setDuplicateOpen(open);
          if (!open) setPendingSubmit(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Similar Ticket Already Open?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  There {duplicateHits.length === 1 ? "is already an open ticket" : "are already open tickets"}{" "}
                  in this category (open, triaged, or in progress). Do you still want to create another?
                </p>
                <ul className="space-y-1 rounded-md border bg-muted/40 p-2 text-left">
                  {duplicateHits.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-medium text-uventorybiz-navy hover:underline"
                      >
                        {t.ticketNumber}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {titleCaseUi(t.status.replace(/_/g, " "))} · {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingSubmit) createMutation.mutate(pendingSubmit);
              }}
              disabled={createMutation.isPending || !pendingSubmit}
              className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
            >
              {createMutation.isPending ? "Submitting…" : "Create Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
