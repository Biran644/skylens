import { z } from "zod";

export const rawFlightSchema = z.object({
  ACID: z.string().min(1),
  "Plane type": z.string().min(1),
  route: z.string().min(3),
  altitude: z.number().int(),
  "departure airport": z.string().min(3),
  "arrival airport": z.string().min(3),
  "departure time": z.number().int(),
  "aircraft speed": z.number(),
  passengers: z.number().int().nonnegative(),
  is_cargo: z.boolean(),
});

export const rawFlightsSchema = z.array(rawFlightSchema);

export type RawFlightInput = z.infer<typeof rawFlightSchema>;
