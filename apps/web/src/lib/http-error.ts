import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'A valid JSON object is required');
  }
}

export function apiError(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const actualError = error instanceof Error ? error.message : String(error);
  console.error(fallback, error);
  return NextResponse.json({ error: `${fallback} (Debug: ${actualError})` }, { status: 500 });
}
