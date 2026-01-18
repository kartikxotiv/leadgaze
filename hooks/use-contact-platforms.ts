import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ContactPlatform } from "@/lib/data/contact-platforms";

export function useContactPlatforms() {
  return useQuery({
    queryKey: ["contact-platforms"],
    queryFn: async () => {
      const response = await fetch("/api/contact-platforms");

      if (!response.ok) {
        throw new Error("Failed to fetch contact platforms");
      }

      const payload = await response.json();

      if (!payload?.success) {
        throw new Error(
          payload?.error || "Failed to fetch contact platforms"
        );
      }

      return payload.data as ContactPlatform[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateContactPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/contact-platforms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to create contact platform");
      }

      const payload = await response.json();

      if (!payload?.success) {
        throw new Error(
          payload?.error || "Failed to create contact platform"
        );
      }

      return payload.data as ContactPlatform;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-platforms"] });
    },
  });
}

