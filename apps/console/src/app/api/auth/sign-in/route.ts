import { handleSignIn } from "../../../../lib/auth/handlers";
import { handlerDeps } from "../../../../server/runtime";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleSignIn(request, handlerDeps());
}
