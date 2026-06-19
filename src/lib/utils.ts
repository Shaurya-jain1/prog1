export const formatTime = (timestamp: any): string => {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" });
};

export const getTodayStr = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getTodayDayName = (): string => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(new Date());
};

export const formatDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

export const getEstimatedWait = (
  currentToken: number,
  yourToken: number,
  avgTimePerToken: number
): number => {
  const tokensAhead = yourToken - currentToken;
  if (tokensAhead <= 0) return 0;
  return tokensAhead * avgTimePerToken;
};

export const getPosition = (
  currentToken: number,
  tokenNumber: number,
  waitingTokens: number
): number => {
  if (tokenNumber <= currentToken) return 0;
  return tokenNumber - currentToken;
};

export const generateOfficeCode = (name: string): string => {
  const prefix = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${suffix}`;
};

export const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const getOfficeUrl = (officeCode: string) => {
  return `${getBaseUrl()}/q/${officeCode}`;
};

export const generateShareMessage = (
  officeName: string,
  officeCode: string
): string => {
  const link = getOfficeUrl(officeCode);
  return `Join our virtual queue at ${officeName}. Scan the QR code at our entrance or click this link: ${link}`;
};

export const classNames = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(" ");
};

export const isPhoneValid = (phone: string): boolean => {
  return /^\d{10}$/.test(phone);
};
