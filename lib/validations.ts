// ============================================================
// Validation — zod schemas for request bodies
// ============================================================

import { z } from "zod";

/** Schema for the job input form */
export const jobInputSchema = z
  .object({
    jobId: z.string().optional(),
    companyName: z.string().optional(),
    jdUrl: z.string().url("Please provide a valid URL").optional().or(z.literal("")),
    jdText: z.string().optional(),
  })
  .refine(
    (data) => {
      // At least one field must have a value
      return !!(data.jobId?.trim() || data.companyName?.trim() || data.jdUrl?.trim() || data.jdText?.trim());
    },
    { message: "Please provide at least one input: Job ID, Company Name, JD URL, or Full JD Text." }
  );

/** Schema for the tailor request (includes master resume type) */
export const tailorRequestSchema = z.object({
  jobInput: jobInputSchema,
  awsMasterUploaded: z.boolean(),
  azureMasterUploaded: z.boolean(),
});

export type JobInputValidated = z.infer<typeof jobInputSchema>;
export type TailorRequestValidated = z.infer<typeof tailorRequestSchema>;
