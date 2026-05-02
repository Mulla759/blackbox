export function templateForLanguage(language: string | null | undefined): string {
  const lang = (language ?? "english").toLowerCase();
  if (lang.includes("spanish")) {
    return "Alerta de emergencia: Hay una advertencia de desastre en su area. Responda 1 si esta a salvo, 2 si necesita ayuda, o 3 si es una emergencia. Responda STOP para cancelar.";
  }
  if (lang.includes("somali")) {
    return "Digniin degdeg ah: Waxaa jira digniin musiibo oo ka jirta aaggaaga. Ku jawaab 1 haddii aad nabad qabto, 2 haddii aad u baahan tahay caawimaad, ama 3 haddii ay tahay xaalad degdeg ah. Ku jawaab STOP si aad uga baxdo.";
  }
  return "Emergency alert: There is a disaster warning in your area. Reply 1 if safe, 2 if you need help, or 3 for emergency. Reply STOP to opt out.";
}
