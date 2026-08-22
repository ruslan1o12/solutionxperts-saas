import { NextRequest, NextResponse } from "next/server";
import { sendPushToUsers } from "@/lib/sendPush";

export async function POST(req: NextRequest) {
  try {
    const { userIds, title, body, url } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0 || !title) {
      return NextResponse.json({ error: "Missing userIds or title." }, { status: 400 });
    }
    await sendPushToUsers(userIds, { title, body: body || "", url });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-push error", err);
    return NextResponse.json({ error: "Failed to send push." }, { status: 500 });
  }
}
