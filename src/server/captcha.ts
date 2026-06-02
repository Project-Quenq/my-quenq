import svgCaptcha from "svg-captcha";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "./env.js";
import type { AppContext } from "./context.js";

const captchaCookieName = "quenq_captcha";

export function generateCaptcha(c: AppContext) {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 2,
    width: 150,
    height: 60,
    fontSize: 60
  });

  setCookie(c, captchaCookieName, captcha.text.toLowerCase(), {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: env.secureCookies,
    maxAge: 600 
  });

  return captcha.data;
}

export function verifyCaptcha(c: AppContext, userInput: string) {
  const stored = getCookie(c, captchaCookieName);
  if (!stored) return false;
  
  const isValid = stored === userInput.trim().toLowerCase();
  
  setCookie(c, captchaCookieName, "", { path: "/", maxAge: 0 });
  
  return isValid;
}