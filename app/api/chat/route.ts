import { CheckInError, runCheckIn } from "@/lib/check-in";
import { noStoreJson, rateLimited, readLimitedJson } from "@/lib/http";
import { language } from "@/lib/language";
import { parseChatBody } from "@/lib/messages";

export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = rateLimited(request, "chat");
  if (limited) return limited;

  const body = await readLimitedJson(request);
  if (!body.ok) return body.response;

  const parsed = parseChatBody(body.value);
  if (!parsed.ok) return noStoreJson({ error: parsed.error }, parsed.status);

  try {
    const turn = await runCheckIn(parsed.value);
    return noStoreJson({ turn });
  } catch (error) {
    if (error instanceof CheckInError) {
      return noStoreJson({ error: error.message }, error.status);
    }
    return noStoreJson({ error: language.ui.errors.generic }, 500);
  }
}
