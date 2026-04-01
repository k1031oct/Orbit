import { z } from "zod";

// Zod Schema to strictly validate the data from GAS
export const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["Todo", "In Progress", "Done"]),
  description: z.string().optional(),
  target: z.string().optional()
});

export const GASResponseSchema = z.array(RequirementSchema);

export type Requirement = z.infer<typeof RequirementSchema>;

export async function fetchRequirements(gasUrl: string): Promise<Requirement[]> {
  try {
    const res = await fetch(gasUrl, {
      method: "GET",
      // Add necessary auth headers here if the GAS app is not public
      // headers: { "Authorization": `Bearer ${process.env.GAS_ACCESS_TOKEN}` }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch GAS data: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Zod Validation (will throw if format is wrong)
    const validatedData = GASResponseSchema.parse(data);
    return validatedData;

  } catch (error) {
    console.error("Error fetching or validating GAS requirements:", error);
    throw error;
  }
}
