import { getIronSession, type IronSessionData } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";

export async function getSession() {
  return getIronSession<IronSessionData>(await cookies(), sessionOptions);
}
