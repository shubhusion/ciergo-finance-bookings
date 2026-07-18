import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

/** One error shape for the whole API. Route handlers stay free of try/catch noise. */
export function handleError(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", issues: err.flatten().fieldErrors },
      { status: 422 }
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export const json = <T>(data: T, status = 200) => NextResponse.json(data, { status });
