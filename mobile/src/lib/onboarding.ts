import { Preferences } from "@capacitor/preferences";

const KEY = "cv-studio.onboarded";

export const hasOnboarded = async () => (await Preferences.get({ key: KEY })).value === "1";
export const markOnboarded = () => Preferences.set({ key: KEY, value: "1" });
