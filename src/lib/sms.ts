const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || "LINEHAI";
const MSG91_ROUTE = process.env.MSG91_ROUTE || "4";

interface SmsPayload {
  phone: string;
  message: string;
}

export const sendSms = async ({ phone, message }: SmsPayload) => {
  if (!MSG91_AUTH_KEY) {
    console.warn("MSG91 auth key not configured. SMS not sent.");
    return { success: false, error: "MSG91 not configured" };
  }

  try {
    const response = await fetch(
      `https://api.msg91.com/api/v5/flow/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authkey": MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
          sender: MSG91_SENDER_ID,
          route: MSG91_ROUTE,
          sms: [
            {
              message,
              to: [phone],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    return { success: data.type === "success", data };
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, error };
  }
};

export const sendConfirmationSms = async (
  phone: string,
  officeName: string,
  tokenNumber: number,
  position: number,
  waitMinutes: number,
  link: string
) => {
  const message = `LineHai? - ${officeName} par aapka token no. ${tokenNumber} jaari kiya gaya hai. Queue mein sthiti: ${position}. Anumaanit prateeksha: ${waitMinutes} min. Link: ${link}`;
  return sendSms({ phone, message });
};

export const sendTenAwaySms = async (
  phone: string,
  officeName: string,
  link: string
) => {
  const message = `LineHai? - Suchna: ${officeName} par aapki baari se 10 token pehle hain. Kripya taiyar rahen. Link: ${link}`;
  return sendSms({ phone, message });
};

export const sendFiveAwaySms = async (
  phone: string,
  officeName: string,
  link: string
) => {
  const message = `LineHai? - Turant suchna: ${officeName} par aapki baari se 5 token pehle hain. Kripya karyalay ki aur prasthan karein. Link: ${link}`;
  return sendSms({ phone, message });
};

export const sendCalledSms = async (
  phone: string,
  officeName: string
) => {
  const message = `LineHai? - Aapki baari aa gayi hai! Kripya turant ${officeName} mein counter par jaayein.`;
  return sendSms({ phone, message });
};
