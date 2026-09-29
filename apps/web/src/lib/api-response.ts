const UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again in a moment.';

// Hosting failures and access gates can return HTML or plain text instead of JSON.
// Keep those responses from leaking browser-specific parsing errors into auth forms.
export async function readApiResponse(response: Response) {
  if (response.redirected) {
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  return data;
}
