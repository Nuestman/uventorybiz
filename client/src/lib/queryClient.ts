import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  additionalHeaders?: Record<string, string>
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: { 
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...additionalHeaders
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function apiFormRequest(
  method: string,
  url: string,
  formData: FormData,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    body: formData,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [baseUrl, ...params] = queryKey;
    let finalUrl = baseUrl as string;
    
    if (params.length > 0 && params[0]) {
      if (typeof params[0] === 'string') {
        finalUrl += `?${params[0]}`;
      } else if (typeof params[0] === 'object' && params[0] !== null) {
        const searchParams = new URLSearchParams();
        Object.entries(params[0] as Record<string, any>).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
          }
        });
        if (searchParams.toString()) {
          finalUrl += `?${searchParams.toString()}`;
        }
      }
    }

    const res = await fetch(finalUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on 401 errors
        if (error instanceof Error && error.message.startsWith('401:')) {
          return false;
        }
        return false; // Don't retry by default
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on 401 errors
        if (error instanceof Error && error.message.startsWith('401:')) {
          return false;
        }
        return false; // Don't retry by default
      },
    },
  },
});
