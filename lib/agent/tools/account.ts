import { z } from "zod";
import { POLICIES, POLICY_TOPICS, type PolicyTopic } from "@/data/policies";
import { defineTool, ok } from "./types";

export const sendPasswordReset = defineTool({
  name: "send_password_reset",
  description: "Send a password reset link. The response is identical whether or not an account exists (no account enumeration).",
  schema: z.object({ email: z.string() }),
  run() {
    return ok({ message: "If an account exists for that email, a password reset link has been sent. It expires in 30 minutes." });
  },
});

export const getPolicy = defineTool({
  name: "get_policy",
  description: `Get Bookly's official policy text. This is the only valid source for policy answers. Topics: ${POLICY_TOPICS.join(", ")}.`,
  schema: z.object({ topic: z.enum(POLICY_TOPICS as [PolicyTopic, ...PolicyTopic[]]) }),
  run(input) {
    return ok({ topic: input.topic, ...POLICIES[input.topic] });
  },
});
