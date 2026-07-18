import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ArrowLeft, TestTube, UserPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/auth";

const instantTestSchema = z
  .object({
    subjectType: z.enum(["customer", "employee"]),
    // Existing customer
    customerId: z.string().optional(),
    // New customer fields (used when creating on the fly)
    newCustomerMode: z.boolean().default(false),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    // Employee subject
    employeeId: z.string().optional(),
    testType: z.enum(["hb", "pregnancy", "malaria", "typhoid"], {
      required_error: "Test type is required",
    }),
    testDate: z.date({ required_error: "Test date is required" }),
    testTime: z.string().min(1, "Test time is required"),
    hbLevel: z.string().optional(),
    testResult: z.enum(["positive", "negative", "invalid"]).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.subjectType === "customer") {
      if (data.newCustomerMode) {
        if (!data.firstName?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "First name is required", path: ["firstName"] });
        }
        if (!data.lastName?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Last name is required", path: ["lastName"] });
        }
      } else if (!data.customerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select an existing customer or enter details for a new one",
          path: ["customerId"],
        });
      }
    } else if (!data.employeeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Employee is required", path: ["employeeId"] });
    }
  });

type InstantTestData = z.infer<typeof instantTestSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  customerNumber?: string | null;
  email?: string | null;
  phone?: string | null;
}

export default function InstantTestForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: customerResults = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", customerSearch],
    queryFn: async () => {
      const q = customerSearch.trim();
      const url = q.length >= 1 ? `/api/customers?search=${encodeURIComponent(q)}` : "/api/customers";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const form = useForm<InstantTestData>({
    resolver: zodResolver(instantTestSchema),
    defaultValues: {
      subjectType: "customer",
      newCustomerMode: false,
      customerId: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      employeeId: "",
      testDate: new Date(),
      testTime: new Date().toTimeString().slice(0, 5),
      testType: "hb",
      hbLevel: "",
      testResult: "negative",
      notes: "",
    },
  });

  const subjectType = form.watch("subjectType");
  const newCustomerMode = form.watch("newCustomerMode");
  const testType = form.watch("testType");
  const selectedCustomerId = form.watch("customerId");

  const submitInstantTest = useMutation({
    mutationFn: async (data: InstantTestData) => {
      let customerId: string | null = null;
      let employeeId: string | null = null;

      if (data.subjectType === "customer") {
        if (data.newCustomerMode) {
          const createRes = await apiRequest("POST", "/api/customers", {
            firstName: data.firstName!.trim(),
            lastName: data.lastName!.trim(),
            phone: data.phone?.trim() || undefined,
            email: data.email?.trim() || undefined,
            status: "active",
          });
          const created = await createRes.json();
          customerId = created.id;
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        } else {
          customerId = data.customerId || null;
        }
      } else {
        employeeId = data.employeeId || null;
      }

      return apiRequest("POST", "/api/instant-tests", {
        customerId,
        employeeId,
        testType: data.testType,
        testNumber: `IT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        testDate: format(data.testDate, "yyyy-MM-dd"),
        testTime: data.testTime,
        hbLevel: data.testType === "hb" ? data.hbLevel : undefined,
        testResult: data.testType !== "hb" ? data.testResult : undefined,
        notes: data.notes,
        testedBy: user?.id,
        createdBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instant-tests"] });
      toast({
        title: "Instant Test Recorded",
        description: "Instant test results have been successfully recorded.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record instant test",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InstantTestData) => {
    submitInstantTest.mutate(data);
  };

  const selectedCustomer = customerResults.find((c) => c.id === selectedCustomerId);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/testing")}
          data-testid="button-back"
          className="self-start"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Instant Tests
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TestTube className="h-6 w-6" />
          Record Instant Test
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instant Test Results Entry (POC)</CardTitle>
          <CardDescription>
            Record Point-of-Care instant test results for a customer (or employee). New customer
            details are saved automatically for next time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Subject type */}
              <FormField
                control={form.control}
                name="subjectType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Who is being tested?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("customerId", "");
                          form.setValue("employeeId", "");
                          form.setValue("newCustomerMode", false);
                        }}
                        value={field.value}
                        className="flex flex-col sm:flex-row gap-3"
                      >
                        <div className="flex items-center space-x-2 rounded-md border px-3 py-2">
                          <RadioGroupItem value="customer" id="subject-customer" />
                          <Label htmlFor="subject-customer" className="font-normal cursor-pointer">
                            Customer (default)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-md border px-3 py-2">
                          <RadioGroupItem value="employee" id="subject-employee" />
                          <Label htmlFor="subject-employee" className="font-normal cursor-pointer">
                            Employee
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer subject */}
              {subjectType === "customer" && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={!newCustomerMode ? "default" : "outline"}
                      onClick={() => {
                        form.setValue("newCustomerMode", false);
                        form.setValue("firstName", "");
                        form.setValue("lastName", "");
                        form.setValue("phone", "");
                        form.setValue("email", "");
                      }}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Select existing
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={newCustomerMode ? "default" : "outline"}
                      onClick={() => {
                        form.setValue("newCustomerMode", true);
                        form.setValue("customerId", "");
                        setCustomerSearch("");
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Enter new customer
                    </Button>
                  </div>

                  {!newCustomerMode ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="customer-search">Search customers</Label>
                        <Input
                          id="customer-search"
                          placeholder="Name, phone, email, or customer #"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-customer">
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customersLoading ? (
                                  <SelectItem value="loading" disabled>
                                    Loading...
                                  </SelectItem>
                                ) : customerResults.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No customers found — try Enter new customer
                                  </SelectItem>
                                ) : (
                                  customerResults.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.firstName} {customer.lastName}
                                      {customer.customerNumber ? ` · ${customer.customerNumber}` : ""}
                                      {customer.phone ? ` · ${customer.phone}` : ""}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            {selectedCustomer && (
                              <p className="text-xs text-muted-foreground">
                                {[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(" · ") ||
                                  "No contact details on file"}
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Jane" data-testid="input-customer-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Doe" data-testid="input-customer-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+233..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="jane@example.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="md:col-span-2 text-xs text-muted-foreground">
                        This person will be saved as a customer so you can find them on the next visit.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Employee subject */}
              {subjectType === "employee" && (
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employeesLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : (
                            employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName} - {employee.employeeNumber}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="testType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select test type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hb">Hemoglobin (HB)</SelectItem>
                          <SelectItem value="pregnancy">Pregnancy Test</SelectItem>
                          <SelectItem value="malaria">Malaria Test</SelectItem>
                          <SelectItem value="typhoid">Typhoid Test</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-test-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {testType === "hb" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium">Hemoglobin Test Result</h3>
                  <FormField
                    control={form.control}
                    name="hbLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hemoglobin Level (g/dL)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="25"
                            placeholder="e.g., 14.5"
                            {...field}
                            data-testid="input-hb-level"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-muted-foreground mt-1">
                          Normal ranges: Male 13.5-17.5 g/dL, Female 12.0-15.5 g/dL
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {testType !== "hb" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium">
                    {testType === "pregnancy" && "Pregnancy Test Result"}
                    {testType === "malaria" && "Malaria Test Result"}
                    {testType === "typhoid" && "Typhoid Test Result"}
                  </h3>
                  <FormField
                    control={form.control}
                    name="testResult"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Result</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={String(field.value ?? "")}>
                          <FormControl>
                            <SelectTrigger data-testid="select-test-result">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="negative">Negative</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="invalid">Invalid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Any additional observations..."
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitInstantTest.isPending}
                  data-testid="button-submit-instant-test"
                >
                  {submitInstantTest.isPending ? "Recording..." : "Record Test Results"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
