import { NextRequest, NextResponse } from "next/server";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || "LINEHAI";
const MSG91_ROUTE = process.env.MSG91_ROUTE || "4";

const SMS_TEMPLATES: Record<string, (vars: Record<string, string>) => string> = {
  confirmation: (v) =>
    `LineHai? - ${v.officeName} par aapka token no. ${v.tokenNumber} jaari kiya gaya hai. Queue mein sthiti: ${v.position}. Anumaanit prateeksha: ${v.waitMinutes} min. Link: ${v.link}`,
  ten_away: (v) =>
    `LineHai? - Suchna: ${v.officeName} par aapki baari se 10 token pehle hain. Kripya taiyar rahen. Link: ${v.link}`,
  five_away: (v) =>
    `LineHai? - Turant suchna: ${v.officeName} par aapki baari se 5 token pehle hain. Kripya karyalay ki aur prasthan karein. Link: ${v.link}`,
  called: (v) =>
    `LineHai? - Aapki baari aa gayi hai! Kripya turant ${v.officeName} mein counter par jaayein.`,
};

export async function POST(request: NextRequest) {
  try {
    const { phone, type, variables } = await request.json();

    if (!phone || !type || !variables) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const template = SMS_TEMPLATES[type];
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Invalid SMS type" },
        { status: 400 }
      );
    }

    if (!MSG91_AUTH_KEY) {
      console.warn("MSG91 not configured. SMS would be:", template(variables));
      return NextResponse.json({
        success: true,
        message: "SMS would be sent (MSG91 not configured)",
        preview: template(variables),
      });
    }

    const message = template(variables);

    const response = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        sender: MSG91_SENDER_ID,
        route: MSG91_ROUTE,
        sms: [
          {
            message,
            to: [phone.replace("+91", "")],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.type === "success") {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: data.message || "SMS sending failed" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("SMS API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
