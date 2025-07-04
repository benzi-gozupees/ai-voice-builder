import { apiRequest } from "../client/src/lib/queryClient";

export const assistantApi = {
  createAssistant: async (businessId: number): Promise<{ success: boolean; assistantId: string; message: string }> => {
    const response = await apiRequest("POST", "/api/assistant-service/create", {
      businessId,
    });
    return response.json();
  },
};

export const businessApi = {
  getAllBusinesses: async () => {
    const response = await apiRequest("GET", "/api/businesses");
    return response.json();
  },

  getBusiness: async (id: number) => {
    const response = await apiRequest("GET", `/api/businesses/${id}`);
    return response.json();
  },
};
